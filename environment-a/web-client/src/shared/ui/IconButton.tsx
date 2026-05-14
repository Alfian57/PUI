import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    icon: ReactNode;
    active?: boolean;
};

export function IconButton({
    label,
    icon,
    active = false,
    className,
    type = "button",
    ...props
}: IconButtonProps): JSX.Element {
    return (
        <button
            type={type}
            aria-label={label}
            title={label}
            className={clsx(
                "inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-brand-steel transition hover:bg-brand-sky hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-50",
                active ? "border-brand-ink bg-brand-ink text-white hover:bg-brand-steel hover:text-white" : "border-brand-steel/15 bg-white",
                className
            )}
            {...props}
        >
            {icon}
        </button>
    );
}
