import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    icon?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
    primary: "bg-brand-ink text-white shadow-soft ring-1 ring-brand-ink/10 hover:bg-brand-steel focus:ring-brand-amber/70",
    secondary: "border border-brand-steel/20 bg-white text-brand-ink hover:border-brand-amber/45 hover:bg-brand-sky",
    ghost: "text-brand-steel hover:bg-brand-sky hover:text-brand-ink",
    danger: "border border-brand-coral/35 text-brand-coral hover:bg-brand-coral/10"
};

export function Button({
    variant = "primary",
    icon,
    className,
    children,
    type = "button",
    ...props
}: ButtonProps): JSX.Element {
    return (
        <button
            type={type}
            className={clsx(
                "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                variantClass[variant],
                className
            )}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}
