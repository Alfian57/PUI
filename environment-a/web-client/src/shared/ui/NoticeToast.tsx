import clsx from "clsx";
import type { Notice } from "@/shared/hooks/useNotice";

type NoticeToastProps = {
    notice: Notice;
    onClose: () => void;
};

export function NoticeToast({ notice, onClose }: NoticeToastProps): JSX.Element {
    return (
        <aside
            className={clsx(
                "fixed right-4 top-4 z-50 w-full max-w-sm animate-rise-in rounded-xl border px-4 py-3 shadow-deck",
                notice.variant === "success"
                    ? "border-brand-success/25 bg-brand-mint text-brand-ink"
                    : "border-brand-coral/25 bg-brand-coral/10 text-brand-coral"
            )}
            role="status"
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{notice.message}</p>
                <button type="button" onClick={onClose} className="text-xs opacity-70 hover:opacity-100">
                    Tutup
                </button>
            </div>
        </aside>
    );
}
