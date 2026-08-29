import { createContext } from "react";
import type { ReactNode } from "react";

export type ConfirmVariant = "default" | "danger";

export type ConfirmOptions = {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    icon?: ReactNode;
};

export type PendingConfirm = ConfirmOptions & {
    resolve: (value: boolean) => void;
};

export type ConfirmDialogContextValue = {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);
