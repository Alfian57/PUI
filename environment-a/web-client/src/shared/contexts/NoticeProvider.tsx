import type { PropsWithChildren } from "react";
import { useNotice } from "@/shared/hooks/useNotice";
import { NoticeToast } from "@/components/shared/NoticeToast";
import { NoticeContext } from "@/shared/contexts/noticeContext";

export function NoticeProvider({ children }: PropsWithChildren): JSX.Element {
    const notice = useNotice();

    return (
        <NoticeContext.Provider value={notice}>
            {children}
            {notice.notice ? <NoticeToast notice={notice.notice} onClose={notice.dismiss} /> : null}
        </NoticeContext.Provider>
    );
}
