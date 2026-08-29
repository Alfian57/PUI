import type { ReactNode } from "react";

type InsightChartPanelProps = {
    title: string;
    description: string;
    children: ReactNode;
};

export function InsightChartPanel({ title, description, children }: InsightChartPanelProps): JSX.Element {
    return (
        <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="mb-5">
                <h2 className="font-display text-xl font-semibold text-brand-logoBlue">{title}</h2>
                <p className="mt-1 text-sm text-brand-steel">{description}</p>
            </div>
            {children}
        </section>
    );
}
