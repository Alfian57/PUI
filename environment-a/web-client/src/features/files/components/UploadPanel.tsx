import { ChangeEvent } from "react";

type UploadPanelProps = {
    disabled: boolean;
    progress: number | null;
    onUpload: (file: File) => Promise<void>;
};

export function UploadPanel({ disabled, progress, onUpload }: UploadPanelProps): JSX.Element {
    async function handleChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        await onUpload(event.target.files[0]);
        event.target.value = "";
    }

    return (
        <section className="rounded-2xl border border-brand-steel/20 bg-white/85 p-5 shadow-soft backdrop-blur">
            <p className="font-display text-[11px] uppercase tracking-[0.28em] text-brand-steel">Ingestion</p>
            <h3 className="mt-1 font-display text-xl text-brand-ink">Upload ke Direktori Aktif</h3>

            <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-brand-steel/35 bg-brand-sky/50 p-4 text-sm text-brand-steel hover:bg-brand-sky">
                <span className="font-medium text-brand-ink">Pilih file dari device</span>
                <input
                    type="file"
                    className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-ink file:px-3 file:py-1.5 file:text-brand-mint"
                    onChange={(event) => void handleChange(event)}
                    disabled={disabled}
                />
            </label>

            {progress !== null ? (
                <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-brand-steel/15">
                        <div
                            className="h-full rounded-full bg-brand-ink transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="mt-1 text-xs text-brand-steel">Progress: {progress}%</p>
                </div>
            ) : null}
        </section>
    );
}
