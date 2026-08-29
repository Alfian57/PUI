import { useCallback, useState } from "react";
import type { PropsWithChildren } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import {
    ConfirmDialogContext,
    type ConfirmOptions,
    type PendingConfirm
} from "@/components/shared/confirmDialogContext";

export function ConfirmDialogProvider({ children }: PropsWithChildren): JSX.Element {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setPending({ ...options, resolve });
        });
    }, []);

    function close(value: boolean): void {
        pending?.resolve(value);
        setPending(null);
    }

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}
            {pending ? (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-ink/45 p-4 backdrop-blur-sm">
                    <section className="w-full max-w-md animate-rise-in rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-deck">
                        <div className="flex items-start justify-between gap-4">
                            <div
                                className={clsx(
                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                                    pending.variant === "danger"
                                        ? "bg-brand-coral/10 text-brand-coral"
                                        : "bg-brand-sky text-brand-steel"
                                )}
                            >
                                {pending.icon ?? (
                                    pending.variant === "danger" ? (
                                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                                    )
                                )}
                            </div>
                            <IconButton
                                label="Tutup dialog"
                                className="h-9 w-9 rounded-xl"
                                icon={<X className="h-4 w-4" aria-hidden="true" />}
                                onClick={() => close(false)}
                            />
                        </div>

                        <div className="mt-5">
                            <h2 className="font-display text-xl font-semibold text-brand-ink">{pending.title}</h2>
                            <p className="mt-2 text-sm leading-6 text-brand-steel">{pending.description}</p>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button variant="secondary" onClick={() => close(false)}>
                                {pending.cancelLabel ?? "Batal"}
                            </Button>
                            <Button
                                variant={pending.variant === "danger" ? "danger" : "primary"}
                                onClick={() => close(true)}
                            >
                                {pending.confirmLabel ?? "Lanjutkan"}
                            </Button>
                        </div>
                    </section>
                </div>
            ) : null}
        </ConfirmDialogContext.Provider>
    );
}
