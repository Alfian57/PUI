import type { ReactNode } from "react";

type SidebarGroupProps = {
    label: string;
    children: ReactNode;
};

export function SidebarGroup({ label, children }: SidebarGroupProps): JSX.Element {
    return (
        <section aria-label={label}>
            <p className="px-4 pb-2 font-display text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-brand-logoYellow/80">
                {label}
            </p>
            <div className="space-y-1">{children}</div>
        </section>
    );
}
