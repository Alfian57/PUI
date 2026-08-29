import { createContext } from "react";
import type { useAuthSession } from "@/pages/auth/_hooks/useAuthSession";

export type AuthSessionContextValue = ReturnType<typeof useAuthSession>;

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
