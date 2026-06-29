export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  environmentName: import.meta.env.VITE_ENVIRONMENT_NAME ?? "environment-a",
  // Security Lab (ransomware-mitigation demo) UI gating. Default OFF.
  // The real enforcement lives in the API (SECURITY_LAB_ENABLED); this only
  // controls whether the menu item and page are exposed in the web client.
  securityLabEnabled:
    String(import.meta.env.VITE_SECURITY_LAB_ENABLED ?? "false").toLowerCase() === "true"
};
