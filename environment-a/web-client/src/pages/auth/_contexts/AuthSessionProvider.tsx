import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { useAuthSession } from "@/pages/auth/_hooks/useAuthSession";
import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { AuthSessionContext } from "@/pages/auth/_contexts/authSessionContext";

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
