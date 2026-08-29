export function ListSkeleton(): JSX.Element {
    return (
        <section className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-brand-line/70">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border-b border-brand-steel/10 px-4 py-3 last:border-b-0">
                    <div className="h-11 animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                </div>
            ))}
        </section>
    );
}
