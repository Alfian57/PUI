export function LogoMark({ compact = false }: { compact?: boolean }): JSX.Element {
    return (
        <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-brand-line/70">
                <img src="/hashbox-logo.png" alt="HashBox" className="h-full w-full object-cover" />
            </span>
            {!compact ? (
                <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold leading-tight text-brand-logoBlue">HashBox</span>
                    <span className="block text-xs font-semibold text-brand-steel">Immutable Object Storage</span>
                </span>
            ) : null}
        </span>
    );
}
