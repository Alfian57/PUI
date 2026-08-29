import { CircleAlert } from "lucide-react";

export function EmptyEvents(): JSX.Element {
    return (
        <div className="rounded-2xl border border-dashed border-brand-line px-5 py-12 text-center">
            <CircleAlert className="mx-auto h-8 w-8 text-brand-steel" aria-hidden="true" />
            <p className="mt-3 font-display text-lg font-semibold text-brand-logoBlue">Belum ada event keamanan</p>
            <p className="mt-1 text-sm text-brand-steel">Event yang memenuhi filter akan muncul di sini.</p>
        </div>
    );
}
