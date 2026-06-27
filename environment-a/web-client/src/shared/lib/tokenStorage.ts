/**
 * tokenStorage — centralised access token management.
 *
 * SECURITY NOTE: Tokens are stored in localStorage which is accessible to any
 * JavaScript running on the same origin (XSS risk). This is a known tradeoff
 * for SPA architectures.
 *
 * Mitigations in place:
 *  - Token is NEVER logged or included in error reports.
 *  - Token is always cleared on logout and on auth failure (see AuthSessionProvider).
 *  - All reads go through this module; no direct localStorage.getItem("pui_*") elsewhere.
 *
 * TODO (future hardening): migrate to httpOnly SameSite=Strict cookie to eliminate
 * XSS token theft. Requires server-side Set-Cookie + CSRF token handling.
 */

const ACCESS_TOKEN_KEY = "pui_access_token";
const LEGACY_TOKEN_KEY = "pui_token";

export const tokenStorage = {
  get(): string {
    // Silently migrate legacy key on first read.
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(ACCESS_TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      return legacy;
    }
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
  },

  set(token: string): void {
    if (!token) {
      // Guard: never store an empty token.
      tokenStorage.clear();
      return;
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  },

  /** Returns true if a token is currently stored (does not validate expiry). */
  exists(): boolean {
    return tokenStorage.get() !== "";
  },
};
