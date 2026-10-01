/** Organization, projects, users, and access control — localStorage for offline dev. */
const ORG_KEY = "spec-console-org";

function getRuntimeConfig() {
  return window.SPEC_CONSOLE_CONFIG || {};
}

function defaultOrg() {
  const cfg = getRuntimeConfig();
  const u = cfg.defaultUser || {};
  const adminId = u.id || "u1";
  const org = {
    name: cfg.orgName || "Spec Console",
    users: [{
      id: adminId,
      name: u.name || "Admin",
      email: u.email || "admin@local.dev",
      role: u.role || "admin",
    }],
    currentUserId: adminId,
    projects: [],
  };
  if (!cfg.demoMode) {
    org.projects = [{
      id: "p1",
      name: "Patient intake",
      description: "Forms and status flows for the intake workflow",
      createdAt: Date.now(),
      createdBy: adminId,
      members: [{ userId: adminId, access: "write", isOwner: true }],
    }];
  }
  return org;
}

function normalizeMember(member, project) {
  const m = { ...member };
  if (m.access !== "read" && m.access !== "write") m.access = "write";
  if (m.isOwner === undefined) m.isOwner = m.userId === project.createdBy;
  if (m.isOwner) m.access = "write";
  return m;
}

function normalizeProject(project) {
  const p = { ...project };
  if (!p.createdBy && p.members?.length) p.createdBy = p.members[0].userId;
  p.members = (p.members || []).map((m) => normalizeMember(m, p));
  if (!p.members.some((m) => m.isOwner) && p.members.length) {
    const creator = p.members.find((m) => m.userId === p.createdBy) || p.members[0];
    creator.isOwner = true;
    creator.access = "write";
  }
  return p;
}

function normalizeUser(user, index) {
  const u = { ...user };
  if (!u.role) u.role = index === 0 ? "admin" : "member";
  return u;
}

function normalizeOrg(org) {
  org.users = (org.users || []).map((u, i) => normalizeUser(u, i));
  if (!org.users.some((u) => u.role === "admin") && org.users.length) {
    org.users[0].role = "admin";
  }
  if (!org.users.some((u) => u.id === org.currentUserId)) {
    org.currentUserId = org.users[0]?.id;
  }
  org.projects = (org.projects || []).map(normalizeProject);
  return org;
}

function loadOrg() {
  try {
    const raw = localStorage.getItem(ORG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = defaultOrg();
      const cfg = getRuntimeConfig();
      const org = normalizeOrg({
        name: cfg.orgName || parsed.name || base.name,
        users: Array.isArray(parsed.users) ? parsed.users : base.users,
        currentUserId: parsed.currentUserId ?? base.currentUserId,
        projects: Array.isArray(parsed.projects) ? parsed.projects : base.projects,
      });
      saveOrg(org);
      return org;
    }
  } catch (_) {}
  const org = defaultOrg();
  saveOrg(org);
  return org;
}

function saveOrg(org) {
  localStorage.setItem(ORG_KEY, JSON.stringify(org));
}

function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 8);
}

function getCurrentUser(org) {
  org = org || loadOrg();
  return org.users.find((u) => u.id === org.currentUserId) || org.users[0] || null;
}

function getProject(projectId, org) {
  org = org || loadOrg();
  return org.projects.find((p) => p.id === projectId) || null;
}

function getProjectMember(projectId, userId, org) {
  org = org || loadOrg();
  const project = getProject(projectId, org);
  if (!project) return null;
  return project.members.find((m) => m.userId === userId) || null;
}

function getProjectAccess(projectId, org) {
  org = org || loadOrg();
  const member = getProjectMember(projectId, org.currentUserId, org);
  return member ? member.access : null;
}

function isProjectOwner(projectId, userId, org) {
  org = org || loadOrg();
  userId = userId ?? org.currentUserId;
  const member = getProjectMember(projectId, userId, org);
  return !!member?.isOwner;
}

function canWrite(projectId, org) {
  return getProjectAccess(projectId, org) === "write";
}

function canManageProjectMembers(projectId, org) {
  return isProjectOwner(projectId, undefined, org);
}

function isOrgAdmin(org) {
  org = org || loadOrg();
  const user = getCurrentUser(org);
  return user?.role === "admin";
}

function getAccessibleProjects(org) {
  org = org || loadOrg();
  const userId = org.currentUserId;
  return org.projects.filter((p) => p.members.some((m) => m.userId === userId));
}

function getProjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("p") || params.get("project") || "";
}

function requireProjectAccess(projectId, options = {}) {
  const { write = false, owner = false, redirect = true } = options;
  const org = loadOrg();
  const project = getProject(projectId, org);
  const access = getProjectAccess(projectId, org);
  const member = getProjectMember(projectId, org.currentUserId, org);

  if (!project || !access) {
    if (redirect) window.location.href = "/index.html?error=no-access";
    return { ok: false, org, project: null, access: null, isOwner: false };
  }
  if (owner && !member?.isOwner) {
    if (redirect) window.location.href = `/project.html?p=${encodeURIComponent(projectId)}&error=not-owner`;
    return { ok: false, org, project, access, isOwner: false };
  }
  if (write && access !== "write") {
    if (redirect) window.location.href = `/project.html?p=${encodeURIComponent(projectId)}&error=readonly`;
    return { ok: false, org, project, access, isOwner: !!member?.isOwner };
  }
  return { ok: true, org, project, access, isOwner: !!member?.isOwner };
}

function createProject(name, description) {
  const org = loadOrg();
  const id = uid("p");
  org.projects.push(
    normalizeProject({
      id,
      name: name || "Untitled project",
      description: description || "",
      createdAt: Date.now(),
      createdBy: org.currentUserId,
      members: [{ userId: org.currentUserId, access: "write", isOwner: true }],
    })
  );
  saveOrg(org);
  return id;
}

function updateProject(projectId, { name, description }) {
  const org = loadOrg();
  if (!isProjectOwner(projectId, undefined, org)) {
    return { ok: false, error: "Only project owners can edit the project" };
  }
  const project = getProject(projectId, org);
  if (!project) return { ok: false, error: "Project not found" };
  if (name !== undefined) {
    const trimmed = (name || "").trim();
    if (!trimmed) return { ok: false, error: "Project name is required" };
    project.name = trimmed;
  }
  if (description !== undefined) project.description = (description || "").trim();
  saveOrg(org);
  return { ok: true, project };
}

function cleanupProjectData(projectId) {
  try {
    const raw = localStorage.getItem("spec-console-forms");
    if (raw) {
      const ws = JSON.parse(raw);
      if (Array.isArray(ws.forms)) {
        ws.forms = ws.forms.filter((f) => f.projectId !== projectId);
        if (ws.activeForm && !ws.forms.some((f) => f.id === ws.activeForm)) ws.activeForm = null;
        localStorage.setItem("spec-console-forms", JSON.stringify(ws));
      }
    }
  } catch (_) {}
  try {
    const raw = localStorage.getItem("spec-console-status");
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.projects)) {
        data.projects = data.projects.filter((p) => p.id !== projectId);
        localStorage.setItem("spec-console-status", JSON.stringify(data));
      }
    }
  } catch (_) {}
  try {
    const raw = localStorage.getItem("spec-console-prototypes");
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.prototypes)) {
        const removed = data.prototypes.filter((p) => p.projectId === projectId);
        data.prototypes = data.prototypes.filter((p) => p.projectId !== projectId);
        if (data.activeId && !data.prototypes.some((p) => p.id === data.activeId)) data.activeId = null;
        localStorage.setItem("spec-console-prototypes", JSON.stringify(data));
        try {
          const sharesRaw = localStorage.getItem("spec-console-prototype-shares");
          const shares = sharesRaw ? JSON.parse(sharesRaw) : {};
          removed.forEach((p) => {
            if (p.shareToken) delete shares[p.shareToken];
          });
          localStorage.setItem("spec-console-prototype-shares", JSON.stringify(shares));
        } catch (_) {}
      }
    }
  } catch (_) {}
}

function deleteProject(projectId) {
  const org = loadOrg();
  if (!isProjectOwner(projectId, undefined, org)) {
    return { ok: false, error: "Only project owners can delete the project" };
  }
  const idx = org.projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return { ok: false, error: "Project not found" };
  org.projects.splice(idx, 1);
  saveOrg(org);
  cleanupProjectData(projectId);
  return { ok: true };
}

function addUser(name, email, role, password) {
  const org = loadOrg();
  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim().toLowerCase();
  if (!trimmedName) return { ok: false, error: "Name is required" };
  if (org.users.some((u) => u.email.toLowerCase() === trimmedEmail && trimmedEmail)) {
    return { ok: false, error: "A user with this email already exists" };
  }
  const user = {
    id: uid("u"),
    name: trimmedName,
    email: trimmedEmail || trimmedName.toLowerCase().replace(/\s+/g, ".") + "@example.com",
    role: role || "member",
  };
  org.users.push(user);
  saveOrg(org);
  if (password && window.Auth) {
    Auth.setCredential(user.id, user.email, password);
  }
  return { ok: true, user };
}

function inviteToProject(projectId, userId, access, isOwner) {
  return assignMember(projectId, userId, access, isOwner);
}

function inviteNewUserToProject(projectId, name, email, access, isOwner, password) {
  const added = addUser(name, email, "member", password);
  if (!added.ok) return added;
  if (password && window.Auth) {
    Auth.setCredential(added.user.id, added.user.email, password);
  }
  const invited = assignMember(projectId, added.user.id, access, isOwner);
  if (!invited.ok) return invited;
  return { ok: true, user: added.user };
}

function assignMember(projectId, userId, access, isOwner) {
  const org = loadOrg();
  if (!canManageProjectMembers(projectId, org)) return { ok: false, error: "Only project owners can manage members" };
  const project = getProject(projectId, org);
  if (!project) return { ok: false, error: "Project not found" };

  const ownerFlag = !!isOwner;
  const accessLevel = ownerFlag ? "write" : access === "read" ? "read" : "write";
  const existing = project.members.find((m) => m.userId === userId);
  if (existing) {
    existing.access = accessLevel;
    existing.isOwner = ownerFlag || existing.isOwner;
    if (existing.isOwner) existing.access = "write";
  } else {
    project.members.push({ userId, access: accessLevel, isOwner: ownerFlag });
  }
  saveOrg(org);
  return { ok: true };
}

function updateMember(projectId, userId, { access, isOwner }) {
  const org = loadOrg();
  if (!canManageProjectMembers(projectId, org)) return { ok: false, error: "Only project owners can manage members" };
  const project = getProject(projectId, org);
  const member = project?.members.find((m) => m.userId === userId);
  if (!member) return { ok: false, error: "Member not found" };

  const owners = project.members.filter((m) => m.isOwner);
  if (member.isOwner && owners.length === 1 && isOwner === false) {
    return { ok: false, error: "A project must have at least one owner" };
  }

  if (isOwner !== undefined) {
    member.isOwner = !!isOwner;
    if (member.isOwner) member.access = "write";
  }
  if (access !== undefined && !member.isOwner) {
    member.access = access === "read" ? "read" : "write";
  }
  saveOrg(org);
  return { ok: true };
}

function removeMember(projectId, userId) {
  const org = loadOrg();
  if (!canManageProjectMembers(projectId, org)) return { ok: false, error: "Only project owners can manage members" };
  const project = getProject(projectId, org);
  if (!project) return { ok: false, error: "Project not found" };

  const member = project.members.find((m) => m.userId === userId);
  if (member?.isOwner && project.members.filter((m) => m.isOwner).length === 1) {
    return { ok: false, error: "Cannot remove the last owner" };
  }

  project.members = project.members.filter((m) => m.userId !== userId);
  saveOrg(org);
  return { ok: true };
}

function removeUser(userId) {
  const org = loadOrg();
  if (org.users.length <= 1) return false;
  org.users = org.users.filter((u) => u.id !== userId);
  org.projects.forEach((p) => {
    p.members = p.members.filter((m) => m.userId !== userId);
    if (!p.members.some((m) => m.isOwner) && p.members.length) {
      p.members[0].isOwner = true;
      p.members[0].access = "write";
    }
  });
  if (org.currentUserId === userId) org.currentUserId = org.users[0]?.id;
  saveOrg(org);
  if (window.Auth) Auth.removeCredential(userId);
  return true;
}

function setCurrentUser(userId) {
  const org = loadOrg();
  if (!org.users.some((u) => u.id === userId)) return false;
  org.currentUserId = userId;
  saveOrg(org);
  return true;
}

function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function accessLabel(access, isOwner) {
  if (isOwner) return "Owner · Read & write";
  if (access === "write") return "Read & write";
  if (access === "read") return "Read only";
  return "No access";
}

function memberRoleLabel(member) {
  if (!member) return "No access";
  return accessLabel(member.access, member.isOwner);
}

window.Org = {
  ORG_KEY,
  loadOrg,
  saveOrg,
  uid,
  getCurrentUser,
  getProject,
  getProjectMember,
  getProjectAccess,
  isProjectOwner,
  canWrite,
  canManageProjectMembers,
  isOrgAdmin,
  getAccessibleProjects,
  getProjectIdFromUrl,
  requireProjectAccess,
  createProject,
  updateProject,
  deleteProject,
  addUser,
  inviteToProject,
  inviteNewUserToProject,
  assignMember,
  updateMember,
  removeMember,
  removeUser,
  setCurrentUser,
  initials,
  accessLabel,
  memberRoleLabel,
};
