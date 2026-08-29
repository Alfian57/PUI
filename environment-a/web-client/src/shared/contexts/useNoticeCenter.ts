import { useContext } from "react";
import { NoticeContext } from "@/shared/contexts/noticeContext";

export function useNoticeCenter() {
    const context = useContext(NoticeContext);
    if (!context) {
        throw new Error("useNoticeCenter must be used within NoticeProvider");
    }

    return context;
}
