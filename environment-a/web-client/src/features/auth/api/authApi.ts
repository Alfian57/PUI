import { http } from "@/shared/api/http";
import type { AuthUser, LoginResponse } from "@/shared/types/domain";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>("/api/v1/auth/login", {
    email,
    password
  });

  return data;
}

export async function whoAmI(): Promise<AuthUser> {
  const { data } = await http.get<{ user: AuthUser }>("/api/v1/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await http.post("/api/v1/auth/logout");
}
