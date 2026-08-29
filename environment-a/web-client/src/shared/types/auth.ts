export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: "user" | "admin";
};

export type LoginResponse = {
  status: string;
  access_token: string;
  expires_at: string;
  user: AuthUser;
};

export type RegisterRequest = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export type PasswordResetConfirmRequest = {
  token: string;
  new_password: string;
  confirm_password: string;
};

export type UpdateProfileRequest = {
  full_name: string;
  email: string;
  current_password?: string;
  new_password?: string;
};
