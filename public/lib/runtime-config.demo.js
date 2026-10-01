/**
 * Demo-repo runtime config — copied over runtime-config.js by scripts/publish-demo-repo.sh
 */
window.SPEC_CONSOLE_CONFIG = {
  demoMode: true,
  orgName: "Demo Organization",
  defaultUser: {
    id: "u1",
    name: "Demo User",
    email: "user@example.com",
    role: "admin",
    /** SHA-256 of "demo" */
    passwordHash: "2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea",
  },
  autoSeedDemo: true,
};
