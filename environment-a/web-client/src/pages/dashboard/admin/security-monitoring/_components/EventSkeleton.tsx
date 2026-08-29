export function EventSkeleton(): JSX.Element {
    return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky to-white bg-[length:200%_100%]" />
            ))}
        </div>
    );
}
