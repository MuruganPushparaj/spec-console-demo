/** Auth — Supabase on production (Vercel), localStorage for offline dev. */
const AUTH_KEY = "spec-console-auth";
const FALLBACK_EMAIL = "admin@local.dev";
const FALLBACK_PASSWORD_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

function getSeedUser() {
  const cfg = window.SPEC_CONSOLE_CONFIG || {};
  const u = cfg.defaultUser || {};
  return {
    id: u.id || "u1",
    name: u.name || "Admin",
    email: (u.email || FALLBACK_EMAIL).toLowerCase(),
    role: u.role || "admin",
    passwordHash: u.passwordHash || FALLBACK_PASSWORD_HASH,
  };
}

const AUTH_API = "/auth";
let supabaseModeCache = null;

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { credentials: {}, session: null };
}

function saveAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

async function hashPassword(password) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ensureSeeded() {
  const cfg = window.SPEC_CONSOLE_CONFIG || {};
  const seed = getSeedUser();
  const org = Org.loadOrg();
  org.name = cfg.orgName || org.name || "Spec Console";

  let admin = org.users.find((u) => u.id === seed.id || u.email.toLowerCase() === seed.email);
  if (!admin) {
    admin = { id: seed.id, name: seed.name, email: seed.email, role: seed.role };
    const withoutLegacy = org.users.filter(
      (u) => u.email.toLowerCase() !== "alex@acme.dev" && u.id !== seed.id
    );
    org.users = [admin, ...withoutLegacy];
  } else {
    admin.id = seed.id;
    admin.name = admin.name || seed.name;
    admin.role = "admin";
    admin.email = seed.email;
  }

  org.projects.forEach((p) => {
    if (!p.members.some((m) => m.userId === admin.id)) {
      p.members.push({ userId: admin.id, access: "write", isOwner: true });
    }
    p.members = p.members.filter((m) => {
      const u = org.users.find((x) => x.id === m.userId);
      return u && u.email.toLowerCase() !== "alex@acme.dev";
    });
    if (!p.members.some((m) => m.isOwner) && p.members.length) {
      p.members[0].isOwner = true;
      p.members[0].access = "write";
    }
  });

  Org.saveOrg(org);

  const auth = loadAuth();
  auth.credentials[admin.id] = {
    email: seed.email,
    passwordHash: seed.passwordHash,
  };
  saveAuth(auth);
}

async function isSupabaseMode() {
  if (supabaseModeCache !== null) return supabaseModeCache;
  try {
    const res = await fetch(`${AUTH_API}/config`, { credentials: "same-origin" });
    const data = await res.json();
    supabaseModeCache = !!data.supabase;
  } catch (_) {
    supabaseModeCache = false;
  }
  return supabaseModeCache;
}

function syncSupabaseUser(user) {
  if (!user?.email) return;
  const org = Org.loadOrg();
  const email = user.email.toLowerCase();
  let local = org.users.find((u) => u.email.toLowerCase() === email);
  if (!local) {
    local = {
      id: user.id,
      name: user.user_metadata?.full_name || user.email.split("@")[0],
      email: user.email,
      role: "member",
    };
    org.users.push(local);
  } else {
    local.id = user.id;
    if (user.user_metadata?.full_name) local.name = user.user_metadata.full_name;
  }
  org.currentUserId = local.id;
  Org.saveOrg(org);
}

function getSession() {
  return loadAuth().session;
}

async function getSessionAsync() {
  if (await isSupabaseMode()) {
    try {
      const res = await fetch(`${AUTH_API}/session`, { credentials: "same-origin" });
      const data = await res.json();
      if (!data.user) return null;
      return { userId: data.user.id, email: data.user.email, supabase: data.user };
    } catch (_) {
      return null;
    }
  }
  return getSession();
}

function syncOrgUser() {
  const session = getSession();
  if (session?.userId) Org.setCurrentUser(session.userId);
}

async function guardPage() {
  if (await isSupabaseMode()) {
    try {
      const res = await fetch(`${AUTH_API}/session`, { credentials: "same-origin" });
      const data = await res.json();
      if (!data.user) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login.html?redirect=${redirect}`);
        return false;
      }
      syncSupabaseUser(data.user);
      return true;
    } catch (_) {
      window.location.replace("/login.html");
      return false;
    }
  }

  ensureSeeded();
  const session = getSession();
  if (!session?.userId) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login.html?redirect=${redirect}`);
    return false;
  }
  syncOrgUser();
  return true;
}

async function login(email, password) {
  if (await isSupabaseMode()) {
    const normalized = (email || "").trim().toLowerCase();
    if (!normalized || !password) return { ok: false, error: "Email and password are required" };

    try {
      const res = await fetch(`${AUTH_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, password }),
        credentials: "same-origin",
      });
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        return { ok: false, error: "Sign-in service unavailable. Wait a minute and try again." };
      }
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || "Invalid email or password" };
      }
      if (data.user) syncSupabaseUser(data.user);
      return { ok: true, user: data.user };
    } catch (_) {
      return { ok: false, error: "Could not reach the server. Try again." };
    }
  }

  ensureSeeded();
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized || !password) return { ok: false, error: "Email and password are required" };

  const org = Org.loadOrg();
  const user = org.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) return { ok: false, error: "Invalid email or password" };

  const auth = loadAuth();
  const cred = auth.credentials[user.id];
  if (!cred) return { ok: false, error: "No login set up for this account. Ask an admin." };

  const hash = await hashPassword(password);
  if (hash !== cred.passwordHash) return { ok: false, error: "Invalid email or password" };

  auth.session = { userId: user.id, email: user.email, at: Date.now() };
  saveAuth(auth);
  Org.setCurrentUser(user.id);
  return { ok: true, user };
}

async function logout() {
  if (await isSupabaseMode()) {
    try {
      await fetch(`${AUTH_API}/logout`, { method: "POST", credentials: "same-origin" });
    } catch (_) {}
    window.location.href = "/login.html";
    return;
  }

  const auth = loadAuth();
  auth.session = null;
  saveAuth(auth);
  window.location.href = "/login.html";
}

async function setCredential(userId, email, password) {
  if (!userId || !password) return { ok: false, error: "Password is required" };
  const auth = loadAuth();
  auth.credentials[userId] = {
    email: (email || "").trim().toLowerCase(),
    passwordHash: await hashPassword(password),
  };
  saveAuth(auth);
  return { ok: true };
}

function removeCredential(userId) {
  const auth = loadAuth();
  delete auth.credentials[userId];
  if (auth.session?.userId === userId) auth.session = null;
  saveAuth(auth);
}

window.Auth = {
  AUTH_KEY,
  guardPage,
  ensureSeeded,
  login,
  logout,
  getSession,
  getSessionAsync,
  isSupabaseMode,
  syncOrgUser,
  syncSupabaseUser,
  setCredential,
  removeCredential,
  hashPassword,
};
