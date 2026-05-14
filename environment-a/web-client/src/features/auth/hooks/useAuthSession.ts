import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { login as loginRequest, logout as logoutRequest, register as registerRequest, updateProfile as updateProfileRequest, whoAmI } from "@/features/auth/api/authApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import { tokenStorage } from "@/shared/lib/tokenStorage";
import type { AuthUser, RegisterRequest, UpdateProfileRequest } from "@/shared/types/domain";

type LoginArgs = {
  email: string;
  password: string;
};

export function useAuthSession() {
  const [token, setToken] = useState<string>(() => tokenStorage.get());
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(token),
    queryFn: whoAmI,
    enabled: Boolean(token),
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: LoginArgs) => loginRequest(email, password),
    onSuccess: (response) => {
      tokenStorage.set(response.access_token);
      setToken(response.access_token);
      queryClient.setQueryData(queryKeys.auth.me(response.access_token), response.user);
    }
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterRequest) => registerRequest(payload)
  });

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setToken("");
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["admin"] });
    queryClient.removeQueries({ queryKey: ["activity"] });
    queryClient.removeQueries({ queryKey: ["directories"] });
    queryClient.removeQueries({ queryKey: ["files"] });
    queryClient.removeQueries({ queryKey: ["workspace"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutRequest();
      } catch {
      }
    }
    clearSession();
  }, [clearSession, token]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfileRequest(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(token), user);
    }
  });

  const user: AuthUser | null = useMemo(() => {
    return meQuery.data ?? loginMutation.data?.user ?? null;
  }, [loginMutation.data?.user, meQuery.data]);

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
    isRestoringSession: Boolean(token) && meQuery.isLoading,
    login: (args: LoginArgs) => loginMutation.mutateAsync(args),
    register: (payload: RegisterRequest) => registerMutation.mutateAsync(payload),
    logout,
    updateProfile: (payload: UpdateProfileRequest) => updateProfileMutation.mutateAsync(payload),
    clearSession,
    loginState: loginMutation,
    registerState: registerMutation,
    updateProfileState: updateProfileMutation,
    meState: meQuery
  };
}
