import { ChangeEvent, useRef, useState } from "react";
import { ChevronDown, FolderPlus, Home, UploadCloud } from "lucide-react";
import { Breadcrumb } from "@/pages/dashboard/_components/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { ViewToggle, type ViewMode } from "@/components/shared/ViewToggle";
import type { DirectoryRecord } from "@/shared/types/directories";
import type { WorkspaceSortOption } from "./_types/workspace";
import type { WorkspaceCustomTimeRange, WorkspaceTimeFilter } from "./_types/driveToolbar";

const MAX_FILE_SIZE = 512 * 1024 * 1024;

type DriveToolbarProps = {
    directoryID: string | null;
    directories: DirectoryRecord[];
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
    directories,
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    {!embedded ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-steel">Lokasi Saat Ini</p>
                    ) : null}
                    <div className={embedded ? "" : "mt-2"}>
                        <Breadcrumb directoryID={directoryID} directories={directories} onNavigate={onNavigate} />
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
                    {directoryID ? (
                        <Button
                            variant="secondary"
                            icon={<Home className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => onNavigate(null)}
                            className="w-full sm:w-auto"
                        >
                            Berkas Saya
                        </Button>
                    ) : null}
                    <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto">
                        {sortOption && onSortChange ? (
                            <label className="relative min-w-0">
                                <span className="sr-only">Urutkan isi</span>
                                <select
                                    value={sortOption}
                                    onChange={(event) => onSortChange(event.target.value as WorkspaceSortOption)}
                                    className="h-11 w-full appearance-none rounded-2xl border border-brand-steel/15 bg-white px-3 pr-10 text-sm font-semibold text-brand-logoBlue outline-none transition hover:bg-brand-sky focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                                >
                                    <option value="newest">Terbaru</option>
                                    <option value="oldest">Terlama</option>
                                    <option value="name-asc">Nama A-Z</option>
                                    <option value="name-desc">Nama Z-A</option>
                                    <option value="type">Jenis</option>
                                    <option value="starred">Berbintang dulu</option>
                                </select>
                                <ChevronDown
                                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-logoBlue"
                                    aria-hidden="true"
                                />
                            </label>
                        ) : null}
                        {timeFilter && onTimeFilterChange ? (
                            <label className="relative min-w-0">
                                <span className="sr-only">Filter waktu</span>
                                <select
                                    value={timeFilter}
                                    onChange={(event) => onTimeFilterChange(event.target.value as WorkspaceTimeFilter)}
                                    className="h-11 w-full appearance-none rounded-2xl border border-brand-steel/15 bg-white px-3 pr-10 text-sm font-semibold text-brand-logoBlue outline-none transition hover:bg-brand-sky focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                                >
                                    <option value="all">Semua waktu</option>
                                    <option value="today">Hari ini</option>
                                    <option value="7d">7 hari terakhir</option>
                                    <option value="30d">30 hari terakhir</option>
                                    <option value="month">Bulan ini</option>
                                    <option value="year">Tahun ini</option>
                                    <option value="custom">Rentang kustom</option>
                                </select>
                                <ChevronDown
                                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-logoBlue"
                                    aria-hidden="true"
                                />
                            </label>
                        ) : null}
                    </div>
                    {timeFilter === "custom" && customTimeRange && onCustomTimeRangeChange ? (
                        <div className="grid grid-cols-2 gap-2 lg:flex">
                            <label className="min-w-0">
                                <span className="sr-only">Tanggal mulai</span>
                                <input
                                    type="date"
                                    value={customTimeRange.from}
                                    onChange={(event) => onCustomTimeRangeChange({ ...customTimeRange, from: event.target.value })}
                                    className="h-11 w-full rounded-2xl border border-brand-steel/15 bg-white px-3 text-sm font-semibold text-brand-logoBlue outline-none transition hover:bg-brand-sky focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                                />
                            </label>
                            <label className="min-w-0">
                                <span className="sr-only">Tanggal akhir</span>
                                <input
                                    type="date"
                                    value={customTimeRange.to}
                                    onChange={(event) => onCustomTimeRangeChange({ ...customTimeRange, to: event.target.value })}
                                    className="h-11 w-full rounded-2xl border border-brand-steel/15 bg-white px-3 text-sm font-semibold text-brand-logoBlue outline-none transition hover:bg-brand-sky focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                                />
                            </label>
                        </div>
                    ) : null}
                    <div className="flex w-full items-center gap-2 lg:w-auto">
                        <Button
                            variant="secondary"
                            icon={<FolderPlus className="h-4 w-4" aria-hidden="true" />}
                            onClick={onCreateFolder}
                            className="min-w-0 flex-1 lg:flex-none"
                        >
                            Direktori
                        </Button>
                        <Button
                            icon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => inputRef.current?.click()}
                            disabled={uploadDisabled}
                            className="min-w-0 flex-1 lg:flex-none"
                        >
                            Unggah
                        </Button>
                        <ViewToggle value={viewMode} onChange={onViewModeChange} />
                    </div>
                    <input ref={inputRef} type="file" className="hidden" onChange={(event) => void handleFileChange(event)} />
                </div>
            </div>

            {uploadProgress !== null ? (
                <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-brand-steel/15">
                        <div className="h-full rounded-full bg-brand-logoYellow transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-brand-steel">Unggah {uploadProgress}%</p>
                </div>
            ) : null}

            {error ? <p className="mt-2 text-xs text-brand-coral">{error}</p> : null}
        </div>
    );
}
