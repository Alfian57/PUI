import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { login as loginRequest, logout as logoutRequest, whoAmI } from "@/features/auth/api/authApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import { tokenStorage } from "@/shared/lib/tokenStorage";
import type { AuthUser } from "@/shared/types/domain";

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

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setToken("");
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["directories"] });
    queryClient.removeQueries({ queryKey: ["files"] });
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

  const user: AuthUser | null = useMemo(() => {
    if (loginMutation.data?.user) {
      return loginMutation.data.user;
    }

    return meQuery.data ?? null;
  }, [loginMutation.data?.user, meQuery.data]);

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
    isRestoringSession: Boolean(token) && meQuery.isLoading,
    login: (args: LoginArgs) => loginMutation.mutateAsync(args),
    logout,
    clearSession,
    loginState: loginMutation,
    meState: meQuery
  };
}
