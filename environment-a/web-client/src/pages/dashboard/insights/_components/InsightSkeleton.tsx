export function InsightSkeleton(): JSX.Element {
    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[1.75rem] bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
            ))}
        </section>
    );
}
