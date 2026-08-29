import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps): JSX.Element {
    return (
        <input
            className={clsx(
                "h-11 w-full rounded-xl border border-brand-line bg-white px-4 text-sm text-brand-ink outline-none ring-brand-logoYellow transition placeholder:text-brand-steel/45 focus:border-brand-logoBlue/40 focus:ring-2 disabled:cursor-not-allowed disabled:bg-brand-sky/55",
                className
            )}
            {...props}
        />
    );
}
