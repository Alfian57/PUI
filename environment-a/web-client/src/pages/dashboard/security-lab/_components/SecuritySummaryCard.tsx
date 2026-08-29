import clsx from "clsx";
import { CheckCircle2, XCircle } from "lucide-react";

type SecuritySummaryCardProps = {
    label: string;
    value: string;
    good: boolean;
};

export function SecuritySummaryCard({ label, value, good }: SecuritySummaryCardProps): JSX.Element {
    return (
        <div className="rounded-2xl border border-brand-line/70 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-steel/70">{label}</p>
            <p className={clsx("mt-1 flex items-center gap-1.5 text-sm font-semibold", good ? "text-emerald-700" : "text-red-700")}>
                {good ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                {value}
            </p>
        </div>
    );
}
