import type { ReactNode } from "react";

type InsightListPanelProps = {
    title: string;
    empty: string;
    emptyIcon?: ReactNode;
    children: ReactNode;
};

export function InsightListPanel({ title, empty, emptyIcon, children }: InsightListPanelProps): JSX.Element {
    const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

    return (
        <section className="flex flex-col rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <h2 className="font-display text-xl font-semibold text-brand-logoBlue">{title}</h2>
            <div className="mt-4 flex flex-1 flex-col">
                {hasChildren ? (
                    <div className="space-y-2">{children}</div>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-brand-steel/20 bg-brand-sky/40 px-4 py-8 text-center">
                        {emptyIcon ? (
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                                {emptyIcon}
                            </div>
                        ) : null}
                        <p className="mt-3 text-sm font-medium text-brand-steel">{empty}</p>
                    </div>
                )}
            </div>
        </section>
    );
}
