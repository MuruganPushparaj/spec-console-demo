/**
 * Loads the Clinic Booking demo project into localStorage (forms, status, prototype).
 * Used by /demo/load.html and auto-seed on first visit when demoMode is enabled.
 */
(function (global) {
  const DEMO_PROJECT_ID = "demo-clinic";
  const FORMS_KEY = "spec-console-forms";
  const STATUS_KEY = "spec-console-status";
  const PROTOTYPES_KEY = "spec-console-prototypes";
  const SHARES_KEY = "spec-console-prototype-shares";
  const INSTALLED_KEY = "spec-console-demo-installed";
  const DEMO_PROTO_ID = "pr-demo-clinic";
  const DEMO_SHARE_TOKEN = "democlinicshare001";

  async function fetchDemoAssets() {
    const [demoRes, statusRes, mockupRes] = await Promise.all([
      fetch("/demo/clinic-booking-demo.json"),
      fetch("/demo/clinic-status-demo.json"),
      fetch("/demo/clinic-booking-mockup.html"),
    ]);
    if (!demoRes.ok || !statusRes.ok || !mockupRes.ok) {
      throw new Error("Could not load demo assets");
    }
    return {
      demo: await demoRes.json(),
      status: await statusRes.json(),
      mockupHtml: await mockupRes.text(),
    };
  }

  function mergeDemoProject(org, demoProject, userId) {
    const existing = org.projects.find((p) => p.id === demoProject.id);
    if (existing) {
      existing.name = demoProject.name;
      existing.description = demoProject.description;
      return;
    }
    org.projects.unshift({
      id: demoProject.id,
      name: demoProject.name,
      description: demoProject.description,
      createdAt: Date.now(),
      createdBy: userId,
      members: [{ userId, access: "write", isOwner: true }],
    });
  }

  function mergeForms(workspace) {
    let ws;
    try {
      const raw = localStorage.getItem(FORMS_KEY);
      ws = raw ? JSON.parse(raw) : { forms: [], activeForm: null, tab: "fields" };
    } catch (_) {
      ws = { forms: [], activeForm: null, tab: "fields" };
    }
    if (!Array.isArray(ws.forms)) ws.forms = [];
    ws.forms = ws.forms.filter((f) => f.projectId !== DEMO_PROJECT_ID);
    ws.forms.push(...workspace.forms);
    ws.activeForm = workspace.activeForm;
    ws.tab = workspace.tab || "fields";
    localStorage.setItem(FORMS_KEY, JSON.stringify(ws));
  }

  function mergeStatus(statusData) {
    let store;
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      store = raw ? JSON.parse(raw) : { projects: [] };
    } catch (_) {
      store = { projects: [] };
    }
    if (!Array.isArray(store.projects)) store.projects = [];
    store.projects = store.projects.filter((p) => p.id !== DEMO_PROJECT_ID);
    store.projects.push(...statusData.projects);
    localStorage.setItem(STATUS_KEY, JSON.stringify(store));
  }

  function mergePrototype(html) {
    let ws;
    try {
      const raw = localStorage.getItem(PROTOTYPES_KEY);
      ws = raw ? JSON.parse(raw) : { prototypes: [], activeId: null };
    } catch (_) {
      ws = { prototypes: [], activeId: null };
    }
    if (!Array.isArray(ws.prototypes)) ws.prototypes = [];
    ws.prototypes = ws.prototypes.filter((p) => p.projectId !== DEMO_PROJECT_ID);

    const proto = {
      id: DEMO_PROTO_ID,
      projectId: DEMO_PROJECT_ID,
      name: "Booking flow mockup",
      fileName: "clinic-booking-mockup.html",
      html,
      size: new Blob([html]).size,
      shareToken: DEMO_SHARE_TOKEN,
      published: false,
      updatedAt: Date.now(),
    };
    ws.prototypes.push(proto);
    ws.activeId = DEMO_PROTO_ID;
    localStorage.setItem(PROTOTYPES_KEY, JSON.stringify(ws));

    let shares = {};
    try {
      shares = JSON.parse(localStorage.getItem(SHARES_KEY) || "{}") || {};
    } catch (_) {
      shares = {};
    }
    shares[DEMO_SHARE_TOKEN] = {
      token: DEMO_SHARE_TOKEN,
      name: proto.name,
      html,
      projectId: DEMO_PROJECT_ID,
      updatedAt: proto.updatedAt,
    };
    localStorage.setItem(SHARES_KEY, JSON.stringify(shares));
  }

  async function installDemo(options) {
    options = options || {};
    const { demo, status, mockupHtml } = await fetchDemoAssets();
    const cfg = global.SPEC_CONSOLE_CONFIG || {};
    const userId = cfg.defaultUser?.id || "u1";

    if (global.Org) {
      const org = global.Org.loadOrg();
      mergeDemoProject(org, demo.project, userId);
      global.Org.saveOrg(org);
    }

    mergeForms(demo.workspace);
    mergeStatus(status);
    mergePrototype(mockupHtml);
    localStorage.setItem(INSTALLED_KEY, String(Date.now()));
    return { projectId: DEMO_PROJECT_ID, tab: options.tab || "fields" };
  }

  function isInstalled() {
    return Boolean(localStorage.getItem(INSTALLED_KEY));
  }

  async function autoSeedIfNeeded() {
    const cfg = global.SPEC_CONSOLE_CONFIG || {};
    if (!cfg.demoMode || !cfg.autoSeedDemo || isInstalled()) return null;
    try {
      return await installDemo();
    } catch (err) {
      console.warn("Demo auto-seed failed", err);
      return null;
    }
  }

  global.DemoBootstrap = {
    DEMO_PROJECT_ID,
    INSTALLED_KEY,
    installDemo,
    isInstalled,
    autoSeedIfNeeded,
  };
})(window);
