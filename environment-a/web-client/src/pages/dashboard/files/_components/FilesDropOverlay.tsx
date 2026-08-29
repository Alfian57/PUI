type FilesDropOverlayProps = {
    selectedDirectoryID: string | null;
};

export function FilesDropOverlay({ selectedDirectoryID }: FilesDropOverlayProps): JSX.Element {
    return (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 top-20 z-30 flex items-center justify-center rounded-[2rem] border-2 border-dashed border-brand-logoYellow bg-white/75 shadow-deck backdrop-blur">
            <div className="rounded-3xl bg-brand-logoBlue px-6 py-4 text-center text-white shadow-deck">
                <p className="font-display text-xl font-semibold">Lepaskan berkas untuk diunggah</p>
                <p className="mt-1 text-sm text-white/75">
                    Berkas akan disimpan ke {selectedDirectoryID ? "direktori yang sedang dibuka" : "Berkas Saya"}.
                </p>
            </div>
        </div>
    );
}
