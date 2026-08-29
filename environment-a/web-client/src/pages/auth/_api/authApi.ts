import { http } from "@/shared/api/http";
import type {
  AuthUser,
  LoginResponse,
  PasswordResetConfirmRequest,
  RegisterRequest,
  UpdateProfileRequest
} from "@/shared/types/auth";

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

export async function register(payload: RegisterRequest): Promise<AuthUser> {
  const { data } = await http.post<{ user: AuthUser }>("/api/v1/auth/register", payload);
  return data.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await http.post("/api/v1/auth/password-reset/request", { email });
}

export async function confirmPasswordReset(payload: PasswordResetConfirmRequest): Promise<void> {
  await http.post("/api/v1/auth/password-reset/confirm", payload);
}

export async function logout(): Promise<void> {
  await http.post("/api/v1/auth/logout");
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<AuthUser> {
  const { data } = await http.patch<{ user: AuthUser }>("/api/v1/auth/me", payload);
  return data.user;
}
