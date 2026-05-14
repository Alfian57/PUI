import { ChangeEvent, useRef, useState } from "react";
import { FolderPlus, Home, UploadCloud } from "lucide-react";
import { Breadcrumb } from "@/features/directories/components/Breadcrumb";
import { Button } from "@/shared/ui/Button";
import { ViewToggle, type ViewMode } from "@/shared/ui/ViewToggle";
import type { WorkspaceSortOption } from "@/widgets/dashboard/components/WorkspaceItemsView";

const MAX_FILE_SIZE = 512 * 1024 * 1024;

export type WorkspaceTimeFilter = "all" | "today" | "7d" | "30d" | "month" | "year" | "custom";
export type WorkspaceCustomTimeRange = {
    from: string;
    to: string;
};

type DriveToolbarProps = {
    directoryID: string | null;
    uploadDisabled: boolean;
    uploadProgress: number | null;
    viewMode: ViewMode;
    sortOption?: WorkspaceSortOption;
    timeFilter?: WorkspaceTimeFilter;
    customTimeRange?: WorkspaceCustomTimeRange;
    onViewModeChange: (value: ViewMode) => void;
    onSortChange?: (value: WorkspaceSortOption) => void;
    onTimeFilterChange?: (value: WorkspaceTimeFilter) => void;
    onCustomTimeRangeChange?: (value: WorkspaceCustomTimeRange) => void;
    onNavigate: (directoryID: string | null) => void;
    onCreateFolder: () => void;
    onUpload: (file: File) => Promise<void>;
    embedded?: boolean;
};

export function DriveToolbar({
    directoryID,
    uploadDisabled,
    uploadProgress,
    viewMode,
    sortOption,
    timeFilter,
    customTimeRange,
    onViewModeChange,
    onSortChange,
    onTimeFilterChange,
    onCustomTimeRangeChange,
    onNavigate,
    onCreateFolder,
    onUpload,
    embedded = false
}: DriveToolbarProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
        setError(null);
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError(`File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 512 MB.`);
            event.target.value = "";
            return;
        }

        await onUpload(file);
        event.target.value = "";
    }

    return (
        <div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                    {!embedded ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-steel">Lokasi Saat Ini</p>
                    ) : null}
                    <div className={embedded ? "" : "mt-2"}>
                        <Breadcrumb directoryID={directoryID} onNavigate={onNavigate} />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {directoryID ? (
                        <Button
                            variant="secondary"
                            icon={<Home className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => onNavigate(null)}
                        >
                            File Saya
                        </Button>
                    ) : null}
                    {sortOption && onSortChange ? (
                        <label className="relative">
                            <span className="sr-only">Urutkan isi</span>
                            <select
                                value={sortOption}
                                onChange={(event) => onSortChange(event.target.value as WorkspaceSortOption)}
                                className="h-11 rounded-2xl border border-brand-steel/15 bg-white px-3 pr-9 text-sm font-semibold text-brand-ink outline-none transition hover:bg-brand-sky focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                            >
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                                <option value="name-asc">Nama A-Z</option>
                                <option value="name-desc">Nama Z-A</option>
                                <option value="type">Jenis</option>
                                <option value="starred">Berbintang dulu</option>
                            </select>
                        </label>
                    ) : null}
                    {timeFilter && onTimeFilterChange ? (
                        <label className="relative">
                            <span className="sr-only">Filter waktu</span>
                            <select
                                value={timeFilter}
                                onChange={(event) => onTimeFilterChange(event.target.value as WorkspaceTimeFilter)}
                                className="h-11 rounded-2xl border border-brand-steel/15 bg-white px-3 pr-9 text-sm font-semibold text-brand-ink outline-none transition hover:bg-brand-sky focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                            >
                                <option value="all">Semua waktu</option>
                                <option value="today">Hari ini</option>
                                <option value="7d">7 hari terakhir</option>
                                <option value="30d">30 hari terakhir</option>
                                <option value="month">Bulan ini</option>
                                <option value="year">Tahun ini</option>
                                <option value="custom">Rentang kustom</option>
                            </select>
                        </label>
                    ) : null}
                    {timeFilter === "custom" && customTimeRange && onCustomTimeRangeChange ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <label>
                                <span className="sr-only">Tanggal mulai</span>
                                <input
                                    type="date"
                                    value={customTimeRange.from}
                                    onChange={(event) => onCustomTimeRangeChange({ ...customTimeRange, from: event.target.value })}
                                    className="h-11 rounded-2xl border border-brand-steel/15 bg-white px-3 text-sm font-semibold text-brand-ink outline-none transition hover:bg-brand-sky focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                                />
                            </label>
                            <label>
                                <span className="sr-only">Tanggal akhir</span>
                                <input
                                    type="date"
                                    value={customTimeRange.to}
                                    onChange={(event) => onCustomTimeRangeChange({ ...customTimeRange, to: event.target.value })}
                                    className="h-11 rounded-2xl border border-brand-steel/15 bg-white px-3 text-sm font-semibold text-brand-ink outline-none transition hover:bg-brand-sky focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                                />
                            </label>
                        </div>
                    ) : null}
                    <Button
                        variant="secondary"
                        icon={<FolderPlus className="h-4 w-4" aria-hidden="true" />}
                        onClick={onCreateFolder}
                    >
                        Folder
                    </Button>
                    <Button
                        icon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => inputRef.current?.click()}
                        disabled={uploadDisabled}
                    >
                        Upload
                    </Button>
                    <ViewToggle value={viewMode} onChange={onViewModeChange} />
                    <input ref={inputRef} type="file" className="hidden" onChange={(event) => void handleFileChange(event)} />
                </div>
            </div>

            {uploadProgress !== null ? (
                <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-brand-steel/15">
                        <div className="h-full rounded-full bg-brand-ink transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-brand-steel">Upload {uploadProgress}%</p>
                </div>
            ) : null}

            {error ? <p className="mt-2 text-xs text-brand-coral">{error}</p> : null}
        </div>
    );
}
