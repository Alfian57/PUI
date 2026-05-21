import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData, type Step, type TooltipRenderProps } from "react-joyride";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { CreateFolderModal } from "@/features/directories/components/CreateFolderModal";
import { useDirectoryTree } from "@/features/directories/hooks/useDirectoryTree";
import { useFilesWorkspace } from "@/features/files/hooks/useFilesWorkspace";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";
import { DashboardShell } from "@/widgets/dashboard/components/DashboardShell";
import { DashboardSidebar } from "@/widgets/dashboard/components/DashboardSidebar";
import { DashboardTopbar } from "@/widgets/dashboard/components/DashboardTopbar";
import { DashboardUtilityRail } from "@/widgets/dashboard/components/DashboardUtilityRail";
import { AdminTopbar } from "@/widgets/dashboard/components/AdminTopbar";
import type { FileModalTab } from "@/widgets/dashboard/components/FilePreviewModal";
import type { WorkspaceBulkSelection } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { useConfirmDialog } from "@/shared/ui/ConfirmDialog";
import type { FileRecord } from "@/shared/types/domain";

const MAX_FILE_SIZE = 512 * 1024 * 1024;

type DashboardTourStep = Step & {
    route?: string;
    sidebar?: boolean;
};

const joyrideStyles = {
    options: {
        primaryColor: "#042351",
        textColor: "#042351",
        zIndex: 10000,
        overlayColor: "rgba(4, 35, 81, 0.38)",
        arrowColor: "#ffffff"
    },
    tooltip: {
        borderRadius: 24,
        boxShadow: "0 24px 70px rgba(4, 35, 81, 0.18)"
    },
    buttonNext: {
        borderRadius: 16,
        backgroundColor: "#042351",
        color: "#ffffff",
        fontWeight: 700,
        padding: "0.7rem 1rem",
        boxShadow: "0 12px 30px rgba(4, 35, 81, 0.18)"
    },
    buttonBack: {
        borderRadius: 16,
        color: "#24486B",
        fontWeight: 700,
        padding: "0.7rem 0.9rem"
    },
    buttonSkip: {
        borderRadius: 16,
        color: "#24486B",
        fontWeight: 700,
        padding: "0.7rem 0.9rem"
    },
    buttonClose: {
        color: "#24486B"
    },
    tooltipFooter: {
        marginTop: 18
    }
} as const;


function cleanupTourOverlay(): void {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.querySelectorAll('[id^="react-joyride"], [data-floating-ui-portal]').forEach((element) => {
        element.remove();
    });
}

function DashboardTourTooltip({
    backProps,
    closeProps,
    continuous,
    index,
    isLastStep,
    primaryProps,
    size,
    step,
    tooltipProps
}: TooltipRenderProps): JSX.Element {
    return (
        <section
            {...tooltipProps}
            className="relative max-w-sm overflow-hidden rounded-[1.75rem] bg-white p-5 text-left shadow-deck ring-1 ring-brand-line/70"
        >
            <button
                {...closeProps}
                type="button"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sky text-brand-steel transition hover:bg-brand-logoBlue hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                aria-label="Tutup tur"
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="pr-10">
                {step.title ? (
                    <h2 className="font-display text-xl font-semibold leading-tight text-brand-logoBlue">{step.title}</h2>
                ) : null}
                <div className="mt-3 text-sm leading-6 text-brand-steel">{step.content}</div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                    {...backProps}
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky hover:text-brand-logoBlue focus:outline-none focus:ring-2 focus:ring-brand-logoYellow disabled:pointer-events-none disabled:opacity-0"
                    disabled={index === 0}
                >
                    Kembali
                </button>
                <div className="flex items-center justify-end gap-2">
                    <span className="rounded-full bg-brand-sky px-3 py-1 text-xs font-semibold text-brand-steel">
                        {index + 1} / {size}
                    </span>
                    <button
                        {...primaryProps}
                        type="button"
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-logoBlue px-5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                    >
                        {isLastStep ? "Selesai" : continuous ? "Lanjut" : "Mulai"}
                    </button>
                </div>
            </div>
        </section>
    );
}

const userTourSteps: DashboardTourStep[] = [
    { target: '[data-tour="dashboard-content"]', title: "Dashboard HashBox", content: "Ini adalah ruang kerja utama untuk mengelola penyimpanan immutable, aktivitas, dan insight berkas Anda.", placement: "center", route: "/app/files" },
    { target: '[data-tour="dashboard-sidebar"]', title: "Navigasi utama", content: "Gunakan sidebar untuk berpindah antara berkas, item berbintang, sampah, riwayat, dan insight.", placement: "right", sidebar: true },
    { target: '[data-tour="sidebar-files"]', title: "Berkas Saya", content: "Mulai dari sini untuk membuat direktori, mengunggah berkas, membuka detail, dan melakukan retrieval.", placement: "right", route: "/app/files", sidebar: true },
    { target: '[data-tour="dashboard-search"]', title: "Pencarian cepat", content: "Cari berkas langsung dari topbar tanpa berpindah halaman.", placement: "bottom" },
    { target: '[data-tour="files-toolbar"]', title: "Aksi workspace", content: "Toolbar ini berisi upload, buat direktori, filter waktu, urutan, dan mode tampilan.", placement: "bottom", route: "/app/files" },
    { target: '[data-tour="sidebar-insights"]', title: "Insight penyimpanan", content: "Buka insight untuk melihat efisiensi deduplikasi, aktivitas, dan komposisi berkas.", placement: "right", route: "/app/insights", sidebar: true },
    { target: '[data-tour="dashboard-account"]', title: "Akun dan profil", content: "Kelola profil atau keluar dari sesi melalui menu akun di kanan atas.", placement: "left" }
];

const adminTourSteps: DashboardTourStep[] = [
    { target: '[data-tour="dashboard-content"]', title: "Dashboard admin", content: "Area ini menampilkan analitik agregat dan status operasional HashBox.", placement: "center", route: "/app/analytics/overview" },
    { target: '[data-tour="dashboard-sidebar"]', title: "Navigasi admin", content: "Sidebar admin memisahkan analitik, penyimpanan, aktivitas, kesehatan sistem, dan laporan.", placement: "right", sidebar: true },
    { target: '[data-tour="sidebar-admin-overview"]', title: "Ikhtisar", content: "Pantau metrik utama aplikasi dari halaman ikhtisar.", placement: "right", route: "/app/analytics/overview", sidebar: true },
    { target: '[data-tour="sidebar-admin-storage"]', title: "Penyimpanan", content: "Gunakan area ini untuk melihat kapasitas, chunk, dan efisiensi storage.", placement: "right", route: "/app/analytics/storage", sidebar: true },
    { target: '[data-tour="sidebar-admin-activity"]', title: "Aktivitas", content: "Analisis tren aktivitas pengguna dan operasi file.", placement: "right", route: "/app/analytics/activity", sidebar: true },
    { target: '[data-tour="sidebar-admin-system"]', title: "Kesehatan sistem", content: "Cek kondisi operasional layanan HashBox dari menu ini.", placement: "right", route: "/app/analytics/system", sidebar: true },
    { target: '[data-tour="dashboard-account"]', title: "Menu akun", content: "Profil dan logout admin tersedia dari menu akun.", placement: "left" }
];

type DashboardWorkspaceContext = {
    directories: ReturnType<typeof useDirectoryTree>;
    files: ReturnType<typeof useFilesWorkspace>;
    detailsOpen: boolean;
    setDetailsOpen: (value: boolean) => void;
    fileModalTab: FileModalTab;
    setFileModalTab: (value: FileModalTab) => void;
    viewMode: "list" | "grid";
    setViewMode: (value: "list" | "grid") => void;
    onCreateFolder: () => void;
    onSelectDirectory: (directoryID: string | null) => void;
    onSelectFile: (fileID: string) => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete: (file: FileRecord) => Promise<void>;
    onSoftDeleteFolder: (directoryID: string, name: string) => Promise<void>;
    onToggleFileStarred: (file: FileRecord) => Promise<void>;
    onToggleFolderStarred: (directoryID: string, name: string, starred: boolean) => Promise<void>;
    onRestoreFile: (file: FileRecord) => Promise<void>;
    onRestoreFolder: (directoryID: string, name: string) => Promise<void>;
    onPermanentDeleteFile: (file: FileRecord) => Promise<void>;
    onPermanentDeleteFolder: (directoryID: string, name: string) => Promise<void>;
    onBulkSoftDelete: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkStar: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkUnstar: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkRestore: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkPermanentDelete: (selection: WorkspaceBulkSelection) => Promise<void>;
    onUpload: (file: File) => Promise<void>;
};

export function DashboardLayout(): JSX.Element {
    const auth = useAuth();

    if (!auth.user) {
        return <div />;
    }

    if (auth.user.role === "admin") {
        return <AdminDashboardLayout />;
    }

    return <UserDashboardLayout />;
}

function UserDashboardLayout(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();
    const navigate = useNavigate();
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [tourRunning, setTourRunning] = useState(false);
    const [tourStepIndex, setTourStepIndex] = useState(0);
    const location = useLocation();
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [fileModalTab, setFileModalTab] = useState<FileModalTab>("preview");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const directories = useDirectoryTree(Boolean(auth.user));
    const files = useFilesWorkspace(Boolean(auth.user), directories.selectedDirectoryID);

    async function handleCreateFolder(name: string, parentID: string | null): Promise<void> {
        try {
            await directories.createFolder(name, parentID);
            notice.show({ variant: "success", message: "Direktori baru berhasil dibuat." });
            setCreateFolderOpen(false);
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Gagal membuat direktori."
            });
        }
    }

    async function handleUpload(file: File): Promise<void> {
        if (file.size > MAX_FILE_SIZE) {
            notice.show({
                variant: "error",
                message: `Berkas terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 512 MB.`
            });
            return;
        }

        try {
            await files.upload(file);
            notice.show({ variant: "success", message: "Unggah berkas berhasil diproses." });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Unggah gagal."
            });
        }
    }

    async function handleDownload(file: FileRecord): Promise<void> {
        try {
            await files.download(file);
            notice.show({ variant: "success", message: `Unduh ${file.name} berhasil.` });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Unduh gagal."
            });
        }
    }

    async function handleSoftDelete(file: FileRecord): Promise<void> {
        const accepted = await confirm({
            title: "Hapus berkas?",
            description: `Berkas "${file.name}" akan dipindahkan ke Sampah dan masih bisa dipulihkan.`,
            confirmLabel: "Hapus berkas",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        try {
            await files.softDelete(file.id);
            notice.show({ variant: "success", message: `${file.name} dipindahkan ke tempat sampah.` });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Hapus berkas gagal."
            });
        }
    }

    async function handleSoftDeleteFolder(directoryID: string, name: string): Promise<void> {
        const accepted = await confirm({
            title: "Pindahkan direktori ke Sampah?",
            description: `Direktori "${name}" beserta isi di dalamnya akan dipindahkan ke Sampah.`,
            confirmLabel: "Pindahkan",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await directories.softDelete(directoryID);
            notice.show({ variant: "success", message: `${name} dipindahkan ke Sampah.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus direktori gagal." });
        }
    }

    async function handleToggleFileStarred(file: FileRecord): Promise<void> {
        const next = !file.starred_at;
        try {
            await files.setStarred(file.id, next);
            notice.show({ variant: "success", message: next ? `${file.name} ditambahkan ke Berbintang.` : `${file.name} dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal mengubah bintang berkas." });
        }
    }

    async function handleToggleFolderStarred(directoryID: string, name: string, starred: boolean): Promise<void> {
        const next = !starred;
        try {
            await directories.setStarred(directoryID, next);
            notice.show({ variant: "success", message: next ? `${name} ditambahkan ke Berbintang.` : `${name} dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal mengubah bintang direktori." });
        }
    }

    async function handleRestoreFile(file: FileRecord): Promise<void> {
        try {
            await files.restore(file.id);
            notice.show({ variant: "success", message: `${file.name} dipulihkan.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Pulihkan berkas gagal." });
        }
    }

    async function handleRestoreFolder(directoryID: string, name: string): Promise<void> {
        const accepted = await confirm({
            title: "Pulihkan direktori?",
            description: `Direktori "${name}" beserta isi di dalamnya akan dikembalikan ke Berkas Saya.`,
            confirmLabel: "Pulihkan"
        });
        if (!accepted) return;

        try {
            await directories.restore(directoryID);
            notice.show({ variant: "success", message: `${name} dipulihkan.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Pulihkan direktori gagal." });
        }
    }

    async function handlePermanentDeleteFile(file: FileRecord): Promise<void> {
        const accepted = await confirm({
            title: "Hapus berkas permanen?",
            description: `Metadata berkas "${file.name}" akan dihapus permanen dari HashBox.`,
            confirmLabel: "Hapus permanen",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await files.permanentDelete(file.id);
            notice.show({ variant: "success", message: `${file.name} dihapus permanen.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus permanen berkas gagal." });
        }
    }

    async function handlePermanentDeleteFolder(directoryID: string, name: string): Promise<void> {
        const accepted = await confirm({
            title: "Hapus direktori permanen?",
            description: `Direktori "${name}" beserta metadata isi di dalamnya akan dihapus permanen.`,
            confirmLabel: "Hapus permanen",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await directories.permanentDelete(directoryID);
            notice.show({ variant: "success", message: `${name} dihapus permanen.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus permanen direktori gagal." });
        }
    }

    async function handleBulkSoftDelete(selection: WorkspaceBulkSelection): Promise<void> {
        const total = selection.files.length + selection.folders.length;
        if (total === 0) return;

        const accepted = await confirm({
            title: "Hapus item terpilih?",
            description: `${total} item akan dipindahkan ke Sampah dan masih bisa dipulihkan.`,
            confirmLabel: "Hapus item",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await Promise.all([
                ...selection.files.map((file) => files.softDelete(file.id)),
                ...selection.folders.map((folder) => directories.softDelete(folder.id))
            ]);
            notice.show({ variant: "success", message: `${total} item dipindahkan ke Sampah.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus item gagal." });
        }
    }

    async function handleBulkStar(selection: WorkspaceBulkSelection): Promise<void> {
        const targetFiles = selection.files.filter((file) => !file.starred_at);
        const targetFolders = selection.folders.filter((folder) => !folder.starred_at);
        const total = targetFiles.length + targetFolders.length;
        if (total === 0) {
            notice.show({ variant: "success", message: "Semua item terpilih sudah berbintang." });
            return;
        }

        try {
            await Promise.all([
                ...targetFiles.map((file) => files.setStarred(file.id, true)),
                ...targetFolders.map((folder) => directories.setStarred(folder.id, true))
            ]);
            notice.show({ variant: "success", message: `${total} item ditambahkan ke Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal memberi bintang item." });
        }
    }

    async function handleBulkUnstar(selection: WorkspaceBulkSelection): Promise<void> {
        const targetFiles = selection.files.filter((file) => file.starred_at);
        const targetFolders = selection.folders.filter((folder) => folder.starred_at);
        const total = targetFiles.length + targetFolders.length;
        if (total === 0) {
            notice.show({ variant: "success", message: "Tidak ada item berbintang pada pilihan." });
            return;
        }

        try {
            await Promise.all([
                ...targetFiles.map((file) => files.setStarred(file.id, false)),
                ...targetFolders.map((folder) => directories.setStarred(folder.id, false))
            ]);
            notice.show({ variant: "success", message: `${total} item dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal menghapus bintang item." });
        }
    }

    async function handleBulkRestore(selection: WorkspaceBulkSelection): Promise<void> {
        const total = selection.files.length + selection.folders.length;
        if (total === 0) return;

        const accepted = await confirm({
            title: "Pulihkan item terpilih?",
            description: `${total} item akan dikembalikan ke Berkas Saya.`,
            confirmLabel: "Pulihkan"
        });
        if (!accepted) return;

        try {
            await Promise.all([
                ...selection.files.map((file) => files.restore(file.id)),
                ...selection.folders.map((folder) => directories.restore(folder.id))
            ]);
            notice.show({ variant: "success", message: `${total} item dipulihkan.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Pulihkan item gagal." });
        }
    }

    async function handleBulkPermanentDelete(selection: WorkspaceBulkSelection): Promise<void> {
        const total = selection.files.length + selection.folders.length;
        if (total === 0) return;

        const accepted = await confirm({
            title: "Hapus permanen item terpilih?",
            description: `${total} item akan dihapus permanen dan tidak bisa dipulihkan.`,
            confirmLabel: "Hapus permanen",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await Promise.all([
                ...selection.files.map((file) => files.permanentDelete(file.id)),
                ...selection.folders.map((folder) => directories.permanentDelete(folder.id))
            ]);
            notice.show({ variant: "success", message: `${total} item dihapus permanen.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus permanen item gagal." });
        }
    }

    function handleSelectDirectory(directoryID: string | null): void {
        directories.setSelectedDirectoryID(directoryID);
        setSidebarOpen(false);
        navigate("/app/files");
    }

    function handleSelectFile(fileID: string): void {
        files.setSelectedFileID(fileID);
        setFileModalTab("preview");
        setDetailsOpen(true);
    }

    function handleSelectSearchResult(file: FileRecord): void {
        directories.setSelectedDirectoryID(file.directory_id ?? null);
        files.setSelectedFileID(file.id);
        setFileModalTab("preview");
        setDetailsOpen(true);
        navigate("/app/files");
    }

    function handleStartTour(): void {
        setTourStepIndex(0);
        setTourRunning(true);
        navigate("/app/files");
    }

    function handleTourCallback(data: EventData): void {
        const { action, index, status, type } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setTourRunning(false);
            setTourStepIndex(0);
            setSidebarOpen(false);
            window.setTimeout(cleanupTourOverlay, 0);
            return;
        }
        if (type !== EVENTS.STEP_AFTER && type !== EVENTS.TARGET_NOT_FOUND) {
            return;
        }
        const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        const nextStep = userTourSteps[nextIndex];
        if (!nextStep) {
            setTourRunning(false);
            setTourStepIndex(0);
            setSidebarOpen(false);
            window.setTimeout(cleanupTourOverlay, 0);
            return;
        }
        setTourStepIndex(nextIndex);
        if (nextStep.route && location.pathname !== nextStep.route) navigate(nextStep.route);
        setSidebarOpen(Boolean(nextStep.sidebar));
    }

    async function handleLogout(): Promise<void> {
        const accepted = await confirm({
            title: "Keluar dari HashBox?",
            description: "Sesi aktif akan ditutup dan Anda perlu login kembali untuk membuka berkas.",
            confirmLabel: "Keluar",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        await auth.logout();
        notice.show({ variant: "success", message: "Anda berhasil logout." });
        navigate("/login", { replace: true });
    }

    const contextValue = useMemo<DashboardWorkspaceContext>(() => ({
        directories,
        files,
        detailsOpen,
        setDetailsOpen,
        fileModalTab,
        setFileModalTab,
        viewMode,
        setViewMode,
        onCreateFolder: () => {
            setCreateFolderOpen(true);
            setSidebarOpen(false);
        },
        onSelectDirectory: handleSelectDirectory,
        onSelectFile: handleSelectFile,
        onDownload: handleDownload,
        onSoftDelete: handleSoftDelete,
        onSoftDeleteFolder: handleSoftDeleteFolder,
        onToggleFileStarred: handleToggleFileStarred,
        onToggleFolderStarred: handleToggleFolderStarred,
        onRestoreFile: handleRestoreFile,
        onRestoreFolder: handleRestoreFolder,
        onPermanentDeleteFile: handlePermanentDeleteFile,
        onPermanentDeleteFolder: handlePermanentDeleteFolder,
        onBulkSoftDelete: handleBulkSoftDelete,
        onBulkStar: handleBulkStar,
        onBulkUnstar: handleBulkUnstar,
        onBulkRestore: handleBulkRestore,
        onBulkPermanentDelete: handleBulkPermanentDelete,
        onUpload: handleUpload
    }), [detailsOpen, directories, fileModalTab, files, viewMode]);

    if (!auth.user) {
        return <div />;
    }

    return (
        <>
            {tourRunning ? (
                <Joyride
                    continuous
                    run={tourRunning}
                    stepIndex={tourStepIndex}
                    steps={userTourSteps}
                    styles={joyrideStyles}
                    tooltipComponent={DashboardTourTooltip}
                    options={{ closeButtonAction: "skip", overlayClickAction: "close", showProgress: true }}
                    locale={{ back: "Kembali", close: "Tutup", last: "Selesai", next: "Lanjut", skip: "Lewati" }}
                    onEvent={handleTourCallback}
                />
            ) : null}
            <DashboardShell
                sidebarOpen={sidebarOpen}
                onSidebarClose={() => setSidebarOpen(false)}
                sidebar={
                    <DashboardSidebar
                        role="user"
                        onClose={() => setSidebarOpen(false)}
                    />
                }
                topbar={
                    <DashboardTopbar
                        user={auth.user}
                        onSelectFile={handleSelectSearchResult}
                        onMenuClick={() => setSidebarOpen(true)}
                        onLogout={() => void handleLogout()}
                    />
                }
            >
                <Outlet context={contextValue} />
                <DashboardUtilityRail user={auth.user} onStartTour={handleStartTour} />
            </DashboardShell>

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

function AdminDashboardLayout(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [tourRunning, setTourRunning] = useState(false);
    const [tourStepIndex, setTourStepIndex] = useState(0);
    const location = useLocation();

    if (!auth.user) {
        return <div />;
    }

    async function handleLogout(): Promise<void> {
        const accepted = await confirm({
            title: "Keluar dari HashBox?",
            description: "Sesi admin akan ditutup dan Anda perlu login kembali untuk membuka dashboard.",
            confirmLabel: "Keluar",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        await auth.logout();
        notice.show({ variant: "success", message: "Anda berhasil logout." });
        navigate("/login", { replace: true });
    }

    function handleStartTour(): void {
        setTourStepIndex(0);
        setTourRunning(true);
        navigate("/app/analytics/overview");
    }

    function handleTourCallback(data: EventData): void {
        const { action, index, status, type } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setTourRunning(false);
            setTourStepIndex(0);
            setSidebarOpen(false);
            window.setTimeout(cleanupTourOverlay, 0);
            return;
        }
        if (type !== EVENTS.STEP_AFTER && type !== EVENTS.TARGET_NOT_FOUND) {
            return;
        }
        const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        const nextStep = adminTourSteps[nextIndex];
        if (!nextStep) {
            setTourRunning(false);
            setTourStepIndex(0);
            setSidebarOpen(false);
            window.setTimeout(cleanupTourOverlay, 0);
            return;
        }
        setTourStepIndex(nextIndex);
        if (nextStep.route && location.pathname !== nextStep.route) navigate(nextStep.route);
        setSidebarOpen(Boolean(nextStep.sidebar));
    }

    return (
        <>
            {tourRunning ? (
                <Joyride
                    continuous
                    run={tourRunning}
                    stepIndex={tourStepIndex}
                    steps={adminTourSteps}
                    styles={joyrideStyles}
                    tooltipComponent={DashboardTourTooltip}
                    options={{ closeButtonAction: "skip", overlayClickAction: "close", showProgress: true }}
                    locale={{ back: "Kembali", close: "Tutup", last: "Selesai", next: "Lanjut", skip: "Lewati" }}
                    onEvent={handleTourCallback}
                />
            ) : null}
            <DashboardShell
            sidebarOpen={sidebarOpen}
            onSidebarClose={() => setSidebarOpen(false)}
            sidebar={(
                <DashboardSidebar
                    role="admin"
                    onClose={() => setSidebarOpen(false)}
                />
            )}
            topbar={(
                <AdminTopbar
                    user={auth.user}
                    onMenuClick={() => setSidebarOpen(true)}
                    onLogout={() => void handleLogout()}
                />
            )}
        >
            <Outlet />
            <DashboardUtilityRail user={auth.user} variant="admin" onStartTour={handleStartTour} />
        </DashboardShell>
        </>
    );
}

export function useDashboardWorkspace(): DashboardWorkspaceContext {
    return useOutletContext<DashboardWorkspaceContext>();
}
