const ACCESS_TOKEN_KEY = "pui_access_token";
const LEGACY_TOKEN_KEY = "pui_token";

export const tokenStorage = {
  get(): string {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY) ?? "";
  },
  set(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
};
