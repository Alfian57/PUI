import { useState } from "react";
import { CreateFolderModal } from "@/features/directories/components/CreateFolderModal";
import { DirectorySidebar } from "@/features/directories/components/DirectorySidebar";
import { useDirectoryTree } from "@/features/directories/hooks/useDirectoryTree";
import { FileInspector } from "@/features/files/components/FileInspector";
import { FileTable } from "@/features/files/components/FileTable";
import { UploadPanel } from "@/features/files/components/UploadPanel";
import { useFilesWorkspace } from "@/features/files/hooks/useFilesWorkspace";
import { formatBytes } from "@/shared/lib/format";
import type { AuthUser } from "@/shared/types/domain";

type SecureStorageDashboardProps = {
    user: AuthUser;
    onLogout: () => Promise<void>;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
};

export function SecureStorageDashboard({
    user,
    onLogout,
    onError,
    onSuccess
}: SecureStorageDashboardProps): JSX.Element {
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const directories = useDirectoryTree(true);
    const files = useFilesWorkspace(true, directories.selectedDirectoryID);

    async function handleCreateFolder(name: string, parentID: string | null): Promise<void> {
        try {
            await directories.createFolder(name, parentID);
            onSuccess("Folder baru berhasil dibuat.");
            setCreateFolderOpen(false);
        } catch (cause) {
            onError(cause instanceof Error ? cause.message : "Gagal membuat folder.");
        }
    }

    async function handleUpload(file: File): Promise<void> {
        try {
            await files.upload(file);
            onSuccess("Upload file berhasil diproses.");
        } catch (cause) {
            onError(cause instanceof Error ? cause.message : "Upload gagal.");
        }
    }

    return (
        <>
            <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <article className="rounded-2xl border border-brand-steel/20 bg-white/85 p-5 shadow-soft backdrop-blur">
                    <p className="font-display text-[11px] uppercase tracking-[0.28em] text-brand-steel">Active Session</p>
                    <h2 className="mt-1 font-display text-2xl text-brand-ink">{user.full_name}</h2>
                    <p className="text-sm text-brand-steel">{user.email}</p>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-brand-sky/60 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-brand-steel">Total Files</p>
                            <p className="mt-1 font-display text-2xl text-brand-ink">{files.stats.totalFiles}</p>
                        </div>
                        <div className="rounded-xl bg-brand-sky/60 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-brand-steel">Total Size</p>
                            <p className="mt-1 font-display text-lg text-brand-ink">{formatBytes(files.stats.totalBytes)}</p>
                        </div>
                        <div className="rounded-xl bg-brand-sky/60 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-brand-steel">Last Dedup</p>
                            <p className="mt-1 font-display text-lg text-brand-ink">{files.stats.dedup}</p>
                        </div>
                    </div>
                </article>

                <article className="rounded-2xl border border-brand-steel/20 bg-white/85 p-5 shadow-soft backdrop-blur">
                    <p className="font-display text-[11px] uppercase tracking-[0.28em] text-brand-steel">Session Control</p>
                    <h3 className="mt-1 font-display text-xl text-brand-ink">Operasional</h3>
                    <p className="mt-2 text-sm text-brand-steel">
                        Keluar dari dashboard untuk menghentikan sesi API dan membersihkan token lokal.
                    </p>
                    <button
                        className="mt-5 rounded-lg border border-brand-coral/40 px-4 py-2 text-sm font-medium text-brand-coral hover:bg-brand-coral/10"
                        type="button"
                        onClick={() => void onLogout()}
                    >
                        Logout
                    </button>
                </article>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1.6fr_1fr]">
                <DirectorySidebar
                    directories={directories.directories}
                    selectedDirectoryID={directories.selectedDirectoryID}
                    loading={directories.isLoading}
                    onSelect={directories.setSelectedDirectoryID}
                    onRefresh={directories.refresh}
                    onOpenCreate={() => setCreateFolderOpen(true)}
                />

                <div className="space-y-4">
                    <UploadPanel
                        disabled={!directories.selectedDirectoryID || files.uploadState.isPending}
                        progress={files.uploadProgress}
                        onUpload={handleUpload}
                    />
                    <FileTable
                        files={files.files}
                        selectedFileID={files.selectedFileID}
                        loading={files.filesState.isLoading}
                        onSelect={files.setSelectedFileID}
                        onDownload={async (file) => {
                            try {
                                await files.download(file);
                                onSuccess(`Unduh ${file.name} berhasil.`);
                            } catch (cause) {
                                onError(cause instanceof Error ? cause.message : "Unduh gagal.");
                            }
                        }}
                        onSoftDelete={async (file) => {
                            try {
                                await files.softDelete(file.id);
                                onSuccess(`${file.name} dipindahkan ke soft delete.`);
                            } catch (cause) {
                                onError(cause instanceof Error ? cause.message : "Soft delete gagal.");
                            }
                        }}
                    />
                </div>

                <FileInspector
                    file={files.fileDetail}
                    lastUploadResult={files.lastUploadResult}
                    loading={files.detailState.isLoading}
                />
            </section>

            <CreateFolderModal
                open={createFolderOpen}
                loading={directories.createFolderState.isPending}
                directories={directories.directories}
                defaultParentID={directories.selectedDirectoryID}
                onClose={() => setCreateFolderOpen(false)}
                onCreate={handleCreateFolder}
            />
        </>
    );
}
