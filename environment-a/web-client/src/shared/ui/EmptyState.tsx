import type { ReactNode } from "react";

type EmptyStateProps = {
    icon: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
    return (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-sky text-brand-amber">
                {icon}
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-brand-ink">{title}</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-brand-steel">{description}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}
