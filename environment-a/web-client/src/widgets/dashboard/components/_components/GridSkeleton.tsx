export function GridSkeleton(): JSX.Element {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-40 rounded-[1.4rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
                    <div className="h-full animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                </div>
            ))}
        </section>
    );
}
