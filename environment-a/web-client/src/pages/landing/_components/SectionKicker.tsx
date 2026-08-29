export function SectionKicker({ children, className = "" }: { children: string; className?: string }): JSX.Element {
    return (
        <p className={`font-display text-[0.68rem] font-semibold uppercase tracking-[0.2em] sm:text-xs sm:tracking-[0.28em] ${className || "text-brand-logoYellow"}`}>
            {children}
        </p>
    );
}
