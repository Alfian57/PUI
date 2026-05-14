import { createContext, PropsWithChildren, useContext } from "react";
import { useNotice } from "@/shared/hooks/useNotice";
import { NoticeToast } from "@/shared/ui/NoticeToast";

type NoticeContextValue = ReturnType<typeof useNotice>;

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function NoticeProvider({ children }: PropsWithChildren): JSX.Element {
    const notice = useNotice();

    return (
        <NoticeContext.Provider value={notice}>
            {children}
            {notice.notice ? <NoticeToast notice={notice.notice} onClose={notice.dismiss} /> : null}
        </NoticeContext.Provider>
    );
}

export function useNoticeCenter(): NoticeContextValue {
    const context = useContext(NoticeContext);
    if (!context) {
        throw new Error("useNoticeCenter must be used within NoticeProvider");
    }

    return context;
}
