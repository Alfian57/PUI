import type { ReactNode } from "react";

type EmptyChartTextProps = {
    message?: string;
    icon?: ReactNode;
    height?: number | string;
};

export function EmptyChartText({
    message = "Belum ada data aktif.",
    icon,
    height = 280
}: EmptyChartTextProps): JSX.Element {
    return (
        <div
            style={{ height: typeof height === "number" ? `${height}px` : height }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-steel/20 bg-brand-sky/40 p-6 text-center"
        >
            {icon ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                    {icon}
                </div>
            ) : null}
            <p className={icon ? "mt-3 text-sm font-medium text-brand-steel" : "text-sm font-medium text-brand-steel"}>
                {message}
            </p>
        </div>
    );
}
