/** Shared app chrome — header, breadcrumbs, user menu, access banners, toast. */
const Shell = (() => {
  let toastTimer;

  function esc(s) {
    return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function toast(message) {
    let el = document.getElementById("sc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "sc-toast";
      el.className = "sc-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function renderHeader(options) {
    const {
      page,
      projectId = "",
      projectName = "",
      moduleName = "",
      showTeam = true,
    } = options;

    const org = Org.loadOrg();
    const user = Org.getCurrentUser(org);
    const access = projectId ? Org.getProjectAccess(projectId, org) : null;

    let crumbs = `<a href="/index.html">Projects</a>`;
    if (page === "project" || page === "forms" || page === "status" || page === "prototype" || page === "project-settings") {
      crumbs += `<span class="sep">/</span><a href="/project.html?p=${encodeURIComponent(projectId)}">${esc(projectName)}</a>`;
    }
    if (page === "forms") crumbs += `<span class="sep">/</span><span class="current">Forms</span>`;
    if (page === "status") crumbs += `<span class="sep">/</span><span class="current">Status validation</span>`;
    if (page === "prototype") crumbs += `<span class="sep">/</span><span class="current">Prototype</span>`;
    if (page === "project-settings") crumbs += `<span class="sep">/</span><span class="current">Settings</span>`;
    if (page === "team") crumbs += `<span class="sep">/</span><span class="current">Team</span>`;

    return `<header class="sc-header">
      <a class="logo" href="/index.html"><span class="logo-mark">SC</span>Spec Console</a>
      <nav class="sc-breadcrumb">${crumbs}</nav>
      <div class="sc-header-spacer"></div>
      ${showTeam ? `<a class="sc-nav-link ${page === "team" ? "active" : ""}" href="/settings/team.html">Team</a>` : ""}
      <div class="sc-user-menu">
        <button class="sc-user-btn" id="sc-user-btn" type="button">
          <span class="sc-avatar">${Org.initials(user?.name)}</span>
          <span>${esc(user?.name || "User")}</span>
        </button>
        <div class="sc-dropdown" id="sc-user-dropdown">
          <div class="sc-dropdown-label">Signed in as</div>
          <div style="padding:0 10px 8px;font-size:13px;color:var(--text-secondary)">${esc(user?.email || "")}</div>
          ${projectId && access ? `<div class="sc-dropdown-label">Project access</div><div style="padding:0 10px 8px"><span class="sc-badge ${access === "write" ? "sc-badge-write" : "sc-badge-read"}">${Org.isProjectOwner(projectId, user?.id, org) ? "Owner · Read & write" : Org.accessLabel(access)}</span></div>` : ""}
          <div class="sc-dropdown-divider"></div>
          <button class="sc-dropdown-item" id="sc-sign-out" type="button">Sign out</button>
        </div>
      </div>
    </header>`;
  }

  function bindHeader() {
    const btn = document.getElementById("sc-user-btn");
    const menu = document.getElementById("sc-user-dropdown");
    if (!btn || !menu) return;

    btn.onclick = (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
    };
    document.addEventListener("click", () => menu.classList.remove("open"));

    const signOut = document.getElementById("sc-sign-out");
    if (signOut) {
      signOut.onclick = () => {
        if (window.Auth) Auth.logout();
        else window.location.href = "/login.html";
      };
    }
  }

  function renderReadonlyBanner(projectId) {
    if (!projectId || Org.canWrite(projectId)) return "";
    return `<div class="sc-banner sc-banner-readonly"><strong>View only</strong> — you have read access on this project. Contact a project admin to request edit access.</div>`;
  }

  function mount(targetId, options) {
    const target = document.getElementById(targetId);
    if (!target) return null;

    let projectId = options.projectId || Org.getProjectIdFromUrl();
    let project = projectId ? Org.getProject(projectId) : null;
    let access = null;

    if (options.requireProject) {
      const check = Org.requireProjectAccess(projectId, {
        write: !!options.requireWrite,
        owner: !!options.requireOwner,
        redirect: true,
      });
      if (!check.ok) return null;
      project = check.project;
      access = check.access;
    } else if (projectId) {
      access = Org.getProjectAccess(projectId);
    }

    const org = Org.loadOrg();
    target.innerHTML = renderHeader({
      ...options,
      projectId,
      projectName: project?.name || options.projectName || "",
    });

    let bannerEl = document.getElementById("sc-readonly-banner");
    if (options.showReadonlyBanner !== false && projectId && !Org.canWrite(projectId, org)) {
      if (!bannerEl) {
        bannerEl = document.createElement("div");
        bannerEl.id = "sc-readonly-banner";
        target.insertAdjacentElement("afterend", bannerEl);
      }
      bannerEl.innerHTML = renderReadonlyBanner(projectId);
    } else if (bannerEl) {
      bannerEl.remove();
    }

    bindHeader();
    return { projectId, project, access, readonly: access === "read", isOwner: Org.isProjectOwner(projectId, undefined, org) };
  }

  return { mount, toast, esc, renderReadonlyBanner };
})();

window.Shell = Shell;
