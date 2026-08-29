import clsx from "clsx";
import { Check } from "lucide-react";

type SelectionToggleProps = {
    selected: boolean;
    label: string;
    onToggle: () => void;
    floating?: boolean;
};

export function SelectionToggle({ selected, label, onToggle, floating = false }: SelectionToggleProps): JSX.Element {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={selected}
            onClick={(event) => {
                event.stopPropagation();
                onToggle();
            }}
            className={clsx(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-brand-logoYellow/35",
                selected
                    ? "border-brand-ink bg-brand-logoBlue text-white shadow-sm"
                    : "border-brand-steel/20 bg-white/95 text-brand-steel hover:border-brand-logoYellow/50 hover:bg-brand-sky/70",
                floating ? "absolute left-3 top-3 z-10 shadow-soft" : ""
            )}
        >
            {selected ? (
                <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
            ) : (
                <span className="h-2 w-2 rounded-sm bg-brand-steel/15 transition" aria-hidden="true" />
            )}
        </button>
    );
}
