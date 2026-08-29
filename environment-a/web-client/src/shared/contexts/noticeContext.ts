import { createContext } from "react";
import type { useNotice } from "@/shared/hooks/useNotice";

export type NoticeContextValue = ReturnType<typeof useNotice>;

export const NoticeContext = createContext<NoticeContextValue | null>(null);
