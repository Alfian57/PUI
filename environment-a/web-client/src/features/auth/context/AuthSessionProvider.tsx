import { createContext, PropsWithChildren, useContext, useEffect } from "react";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";

type AuthSessionContextValue = ReturnType<typeof useAuthSession>;

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren): JSX.Element {
    const auth = useAuthSession();
    const notice = useNoticeCenter();

    useEffect(() => {
        if (auth.meState.isError) {
            auth.clearSession();
            notice.show({
                variant: "error",
                message: "Sesi login tidak valid, silakan masuk kembali."
            });
        }
    }, [auth.clearSession, auth.meState.isError, notice.show]);

    return <AuthSessionContext.Provider value={auth}>{children}</AuthSessionContext.Provider>;
}

export function useAuth(): AuthSessionContextValue {
    const context = useContext(AuthSessionContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthSessionProvider");
    }

    return context;
}
