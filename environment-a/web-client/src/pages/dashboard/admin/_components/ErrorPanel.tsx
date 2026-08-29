type ErrorPanelProps = {
    message?: string;
};

export function ErrorPanel({ message = "Data belum dapat dimuat. Coba ulang beberapa saat lagi." }: ErrorPanelProps): JSX.Element {
    return (
        <section className="rounded-[1.75rem] border border-brand-coral/20 bg-white p-6 text-brand-coral shadow-soft">
            {message}
        </section>
    );
}
