import { configDefaults } from "./defaults";

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? configDefaults.apiBaseUrl,
  // Security Lab (ransomware-mitigation demo) UI gating. Default OFF.
  // The real enforcement lives in the API (SECURITY_LAB_ENABLED); this only
  // controls whether the menu item and page are exposed in the web client.
  securityLabEnabled:
    String(import.meta.env.VITE_SECURITY_LAB_ENABLED ?? configDefaults.securityLabEnabled).toLowerCase() ===
    "true"
};
