import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps): JSX.Element {
    return (
        <select
            className={clsx(
                "h-11 w-full rounded-xl border border-brand-line bg-white px-3 text-sm text-brand-ink outline-none transition focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/30 disabled:cursor-not-allowed disabled:bg-brand-sky/55",
                className
            )}
            {...props}
        />
    );
}
