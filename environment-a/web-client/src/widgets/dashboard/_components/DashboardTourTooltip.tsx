import { X } from "lucide-react";
import type { TooltipRenderProps } from "react-joyride";

export function DashboardTourTooltip({
    backProps,
    closeProps,
    continuous,
    index,
    isLastStep,
    primaryProps,
    size,
    step,
    tooltipProps
}: TooltipRenderProps): JSX.Element {
    return (
        <section
            {...tooltipProps}
            className="relative max-w-sm overflow-hidden rounded-[1.75rem] bg-white p-5 text-left shadow-deck ring-1 ring-brand-line/70"
        >
            <button
                {...closeProps}
                type="button"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sky text-brand-steel transition hover:bg-brand-logoBlue hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                aria-label="Tutup tur"
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="pr-10">
                {step.title ? (
                    <h2 className="font-display text-xl font-semibold leading-tight text-brand-logoBlue">{step.title}</h2>
                ) : null}
                <div className="mt-3 text-sm leading-6 text-brand-steel">{step.content}</div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                    {...backProps}
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky hover:text-brand-logoBlue focus:outline-none focus:ring-2 focus:ring-brand-logoYellow disabled:pointer-events-none disabled:opacity-0"
                    disabled={index === 0}
                >
                    Kembali
                </button>
                <div className="flex items-center justify-end gap-2">
                    <span className="rounded-full bg-brand-sky px-3 py-1 text-xs font-semibold text-brand-steel">
                        {index + 1} / {size}
                    </span>
                    <button
                        {...primaryProps}
                        type="button"
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-logoBlue px-5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                    >
                        {isLastStep ? "Selesai" : continuous ? "Lanjut" : "Mulai"}
                    </button>
                </div>
            </div>
        </section>
    );
}
