import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ReportDownloadCardProps = {
    icon: ReactNode;
    title: string;
    description: string;
    buttonLabel: string;
    variant?: "primary" | "secondary";
    onDownload: () => void;
    disabled: boolean;
};

export function ReportDownloadCard({ icon, title, description, buttonLabel, variant, onDownload, disabled }: ReportDownloadCardProps): JSX.Element {
    return (
        <article className="rounded-[1.75rem] bg-white p-6 shadow-soft ring-1 ring-brand-line/70">
            {icon}
            <h2 className="mt-4 font-display text-xl font-semibold text-brand-logoBlue">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-brand-steel">{description}</p>
            <Button className="mt-5" variant={variant} disabled={disabled} onClick={onDownload}>
                {buttonLabel}
            </Button>
        </article>
    );
}
