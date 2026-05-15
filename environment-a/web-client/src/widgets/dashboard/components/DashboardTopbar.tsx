import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, Search, UserCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { searchFiles } from "@/features/files/api/fileApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import { formatBytes } from "@/shared/lib/format";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import type { AuthUser, FileRecord } from "@/shared/types/domain";

type DashboardTopbarProps = {
    user: AuthUser;
    onSelectFile: (file: FileRecord) => void;
    onMenuClick: () => void;
    onLogout: () => void;
};

export function DashboardTopbar({ user, onSelectFile, onMenuClick, onLogout }: DashboardTopbarProps): JSX.Element {
    const [input, setInput] = useState("");
    const [query, setQuery] = useState("");
    const [accountOpen, setAccountOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setQuery(input.trim()), 350);
        return () => clearTimeout(timer);
    }, [input]);

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.files.search(query),
        queryFn: () => searchFiles(query, undefined, 6),
        enabled: query.length >= 2
    });

    const results = data?.files ?? [];
    const showResults = query.length >= 2 && (isLoading || results.length > 0 || data);

    return (
        <header className="sticky top-0 z-20 border-b border-brand-steel/10 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-brand-steel hover:bg-brand-sky lg:hidden"
                    aria-label="Menu"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="relative w-full max-w-xl">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-steel" aria-hidden="true" />
                    <input
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Telusuri berkas di HashBox"
                        className="h-10 w-full rounded-2xl border border-transparent bg-brand-sky/75 px-10 text-sm text-brand-ink outline-none ring-brand-amber transition placeholder:text-brand-steel/70 focus:border-brand-steel/20 focus:bg-white focus:ring-2"
                    />
                    {input ? (
                        <button
                            type="button"
                            onClick={() => {
                                setInput("");
                                setQuery("");
                            }}
                            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-brand-steel hover:bg-white"
                            aria-label="Bersihkan pencarian"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    ) : null}

                    {showResults ? (
                        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-3xl border border-brand-steel/15 bg-white shadow-deck">
                            {isLoading ? (
                                <p className="px-4 py-3 text-sm text-brand-steel">Mencari berkas...</p>
                            ) : null}

                            {!isLoading && results.length === 0 ? (
                                <p className="px-4 py-3 text-sm text-brand-steel">Tidak ada berkas yang cocok.</p>
                            ) : null}

                            {results.map((file) => (
                                <button
                                    key={file.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectFile(file);
                                        setInput("");
                                        setQuery("");
                                    }}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-brand-sky"
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-brand-ink">{file.name}</span>
                                        <span className="text-xs text-brand-steel">{formatBytes(file.size_bytes)}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div
                    className="relative shrink-0"
                    onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setAccountOpen(false);
                        }
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setAccountOpen((current) => !current)}
                        className="flex h-10 w-10 items-center justify-center rounded-full outline-none ring-brand-amber transition hover:ring-2 focus:ring-2"
                        aria-label="Menu akun"
                        aria-expanded={accountOpen}
                    >
                        <UserAvatar name={user.full_name} size="sm" />
                    </button>

                    {accountOpen ? (
                        <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-3xl border border-brand-steel/10 bg-white p-2 shadow-deck">
                            <div className="px-3 py-3">
                                <p className="truncate text-sm font-semibold text-brand-ink">{user.full_name}</p>
                                <p className="truncate text-xs text-brand-steel">{user.email}</p>
                            </div>
                            <div className="h-px bg-brand-steel/10" />
                            <Link
                                to="/app/profile"
                                onClick={() => setAccountOpen(false)}
                                className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-brand-steel transition hover:bg-brand-sky hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-amber/70"
                            >
                                <UserCircle className="h-4 w-4" aria-hidden="true" />
                                Profil
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setAccountOpen(false);
                                    onLogout();
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-brand-coral transition hover:bg-brand-coral/10 focus:outline-none focus:ring-2 focus:ring-brand-amber/70"
                            >
                                <LogOut className="h-4 w-4" aria-hidden="true" />
                                Keluar
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
