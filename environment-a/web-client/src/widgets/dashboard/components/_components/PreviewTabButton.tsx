import clsx from "clsx";

type PreviewTabButtonProps = {
    active: boolean;
    onClick: () => void;
    children: string;
};

export function PreviewTabButton({ active, onClick, children }: PreviewTabButtonProps): JSX.Element {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                active ? "bg-brand-ink text-white" : "text-brand-steel hover:bg-brand-sky hover:text-brand-ink"
            )}
        >
            {children}
        </button>
    );
}
