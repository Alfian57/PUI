import { useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
    Activity,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Database,
    Download,
    Files,
    Fingerprint,
    FolderLock,
    Gauge,
    HardDrive,
    KeyRound,
    Layers3,
    LogIn,
    Menu,
    Network,
    RefreshCcw,
    Search,
    Server,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UploadCloud,
    Users,
    X
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";

type IconCard = {
    title: string;
    description: string;
    icon: LucideIcon;
};

const sectionHeadingClass = "mt-3 max-w-3xl break-words font-display text-[clamp(1.55rem,6vw,2.65rem)] font-semibold leading-[1.14] text-brand-logoBlue sm:leading-tight lg:text-5xl";
const darkSectionHeadingClass = "mt-3 max-w-3xl break-words font-display text-[clamp(1.55rem,6vw,2.65rem)] font-semibold leading-[1.14] text-white sm:leading-tight lg:text-5xl";

const navItems = [
    { label: "Solusi", href: "#solusi" },
    { label: "Fitur", href: "#fitur" },
    { label: "Arsitektur", href: "#arsitektur" },
    { label: "Validasi", href: "#validasi" },
    { label: "FAQ", href: "#faq" }
];

const proofPoints = [
    {
        value: "CAS",
        title: "Content-addressable",
        description: "Chunk diidentifikasi dari hash kontennya, bukan dari nama file."
    },
    {
        value: "FastCDC",
        title: "Chunking adaptif",
        description: "Perubahan kecil tidak memaksa sistem menyimpan ulang seluruh file."
    },
    {
        value: "UDS",
        title: "Domain terpisah",
        description: "API metadata berkomunikasi ke Vault Core lewat jalur lokal terbatas."
    }
];

const threatCards: IconCard[] = [
    {
        title: "Backup mutable rentan dimanipulasi",
        description: "Saat server aplikasi diambil alih, jalur autentikasi sah dapat disalahgunakan untuk menimpa atau menghapus cadangan.",
        icon: ShieldAlert
    },
    {
        title: "WORM konvensional bisa boros ruang",
        description: "Perubahan kecil pada file besar dapat membuat seluruh objek tersimpan ulang dan memicu data bloat.",
        icon: HardDrive
    },
    {
        title: "Riwayat dan status perlu terlihat",
        description: "Pengguna tetap butuh folder, metadata keamanan, soft delete, pemulihan, dan aktivitas yang mudah diaudit.",
        icon: Activity
    }
];

const solutionCards: IconCard[] = [
    {
        title: "Immutability logis",
        description: "Chunk fisik, manifest objek, dan referensi penyimpanan tetap berada di Vault Core meskipun metadata aplikasi berubah.",
        icon: ShieldCheck
    },
    {
        title: "Deduplikasi tingkat chunk",
        description: "File identik atau file dengan perubahan sebagian dapat berbagi chunk yang sama untuk menghemat kapasitas.",
        icon: Database
    },
    {
        title: "Pemisahan otoritas",
        description: "Environment A mengelola aplikasi dan metadata, sedangkan Environment B menjaga penyimpanan immutable.",
        icon: Network
    }
];

const demoFeatures: IconCard[] = [
    {
        title: "Upload dan download",
        description: "Antarmuka demonstrasi mengalirkan file ke API, lalu objek dapat direkonstruksi dan diunduh kembali.",
        icon: UploadCloud
    },
    {
        title: "Direktori logis",
        description: "Folder pribadi menjaga dokumen tetap rapi tanpa memberi aplikasi kuasa untuk menghapus chunk fisik.",
        icon: FolderLock
    },
    {
        title: "Starred, trash, restore",
        description: "Status berkas dikelola sebagai metadata logis, termasuk soft delete dan pemulihan item dari sampah.",
        icon: Trash2
    },
    {
        title: "Metadata keamanan",
        description: "Detail file menampilkan hash, manifest, ukuran, jumlah chunk, dan informasi deduplikasi yang relevan.",
        icon: Fingerprint
    },
    {
        title: "Insight storage",
        description: "Ringkasan file, aktivitas, tipe data, trash, starred, dan efisiensi ruang bantu membaca kondisi sistem.",
        icon: BarChart3
    },
    {
        title: "Activity log",
        description: "Login, upload, download, hapus, dan restore tercatat untuk membantu audit aktivitas pengguna.",
        icon: Activity
    }
];

const architectureSteps: IconCard[] = [
    {
        title: "Environment A",
        description: "React web client, autentikasi, direktori, metadata file, starred, trash, dan endpoint API publik.",
        icon: Server
    },
    {
        title: "UDS boundary",
        description: "API Service meneruskan operasi konten ke Vault Core melalui Unix Domain Socket di node lokal.",
        icon: KeyRound
    },
    {
        title: "FastCDC + hash",
        description: "Vault Core memecah aliran file menjadi chunk, menghitung identitas konten, lalu mengecek duplikasi.",
        icon: Layers3
    },
    {
        title: "Vault Core",
        description: "Chunk baru dan manifest immutable disimpan di Environment B dengan BadgerDB sebagai metadata fisik.",
        icon: Database
    }
];

const validationCards: IconCard[] = [
    {
        title: "Deduplikasi penuh",
        description: "File identik dipakai untuk membuktikan chunk yang sama tidak ditulis ulang.",
        icon: CheckCircle2
    },
    {
        title: "Perubahan sebagian",
        description: "File dengan modifikasi kecil dipakai untuk melihat kemampuan FastCDC menjaga efisiensi chunk.",
        icon: Gauge
    },
    {
        title: "Crash consistency",
        description: "Skenario proses terhenti sebelum commit memvalidasi konsistensi metadata dan manifest.",
        icon: RefreshCcw
    },
    {
        title: "Simulasi manipulasi",
        description: "Serangan lewat lapisan aplikasi diuji untuk memastikan soft delete tidak merusak objek fisik Vault Core.",
        icon: ShieldAlert
    }
];

const scopeNotes = [
    "Fokus sistem berada pada CAS, FastCDC, deduplikasi, immutability logis, dan pemisahan otoritas single-node.",
    "Aplikasi web menyediakan antarmuka operasional untuk upload, folder, metadata keamanan, soft delete, restore, dan retrieval.",
    "Soft delete dan retensi mengubah status metadata aplikasi, bukan menghapus chunk fisik, manifest, atau referensi Vault Core.",
    "Ruang lingkup belum mencakup garbage collection fisik, high availability, replikasi terdistribusi, atau read-proxy penuh."
];

const faqs = [
    {
        question: "Apa inti HashBox?",
        answer: "HashBox adalah aplikasi Immutable Object Storage berbasis CAS dan FastCDC untuk menjaga integritas cadangan sekaligus mengurangi pemborosan kapasitas lewat deduplikasi chunk."
    },
    {
        question: "Kenapa perlu memisahkan Environment A dan B?",
        answer: "Pemisahan ini membatasi dampak kompromi aplikasi. Environment A menangani metadata dan UI, sementara Vault Core di Environment B menjaga chunk dan manifest immutable."
    },
    {
        question: "Apakah file yang dihapus dari UI langsung hilang dari storage?",
        answer: "Tidak. Penghapusan di UI adalah soft delete pada metadata logis. Chunk fisik, manifest objek, dan referensi penyimpanan tetap berada di Vault Core."
    },
    {
        question: "Apa yang membuat FastCDC relevan?",
        answer: "FastCDC memecah file berdasarkan konten, sehingga file besar dengan perubahan kecil bisa tetap berbagi chunk lama dan tidak selalu menghasilkan salinan penuh baru."
    }
];

function LogoMark({ compact = false }: { compact?: boolean }): JSX.Element {
    return (
        <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-brand-line/70">
                <img src="/hashbox-logo.png" alt="HashBox" className="h-full w-full object-cover" />
            </span>
            {!compact ? (
                <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold leading-tight text-brand-logoBlue">HashBox</span>
                    <span className="block text-xs font-semibold text-brand-steel">Immutable Object Storage</span>
                </span>
            ) : null}
        </span>
    );
}

function SectionKicker({ children, className = "" }: { children: string; className?: string }): JSX.Element {
    return (
        <p className={`font-display text-[0.68rem] font-semibold uppercase tracking-[0.2em] sm:text-xs sm:tracking-[0.28em] ${className || "text-brand-logoYellow"}`}>
            {children}
        </p>
    );
}

function FeatureCard({ item, tone = "light", className = "" }: { item: IconCard; tone?: "light" | "blue" | "yellow" | "mint"; className?: string }): JSX.Element {
    const Icon = item.icon;
    const styles = {
        light: "border-brand-line bg-white text-brand-logoBlue",
        blue: "border-brand-logoBlue bg-brand-logoBlue text-white",
        yellow: "border-brand-logoYellow bg-brand-logoYellow text-brand-logoBlue",
        mint: "border-brand-mint bg-brand-mint text-brand-logoBlue"
    };
    const muted = tone === "blue" ? "text-white/72" : "text-brand-steel";
    const iconBg = tone === "yellow" ? "bg-white/70 text-brand-logoBlue" : tone === "blue" ? "bg-white/12 text-brand-logoYellow" : "bg-brand-logoYellow/14 text-brand-logoBlue";

    return (
        <article className={`relative overflow-hidden rounded-[1.5rem] border p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-deck sm:rounded-[2rem] sm:p-6 ${styles[tone]} ${className}`}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full border-[18px] border-current opacity-[0.06]" />
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold leading-tight">{item.title}</h3>
            <p className={`mt-3 text-sm leading-6 ${muted}`}>{item.description}</p>
        </article>
    );
}

export function LandingPage(): JSX.Element {
    const auth = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dashboardPath = auth.user?.role === "admin" ? "/app/analytics" : "/app/files";
    const primaryTarget = auth.user ? dashboardPath : "/register";
    const primaryLabel = auth.user ? "Buka dashboard" : "Daftar sekarang";

    return (
        <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-brand-ink">
            <section className="relative isolate overflow-hidden bg-brand-sky">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[-8rem] top-10 h-80 w-80 rounded-full bg-brand-logoYellow/20 blur-3xl" />
                    <div className="absolute right-[-10rem] top-16 h-96 w-96 rounded-full bg-brand-mint/80 blur-3xl" />
                    <div className="absolute left-1/2 top-28 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border-[4rem] border-white/55" />
                    <div className="absolute bottom-10 left-8 grid grid-cols-6 gap-3 opacity-35">
                        {Array.from({ length: 30 }).map((_, index) => (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-blueprint" key={index} />
                        ))}
                    </div>
                </div>

                <div className="relative mx-auto max-w-7xl px-5 py-5 sm:px-7 lg:px-8">
                    <header className="sticky top-5 z-30 rounded-[1.75rem] border border-white/80 bg-white/86 px-4 py-3 shadow-soft backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4">
                            <Link to="/" aria-label="HashBox home">
                                <LogoMark />
                            </Link>

                            <nav className="hidden items-center gap-1 rounded-2xl bg-brand-sky/70 p-1 text-sm font-semibold text-brand-steel lg:flex">
                                {navItems.map((item) => (
                                    <a
                                        className="rounded-xl px-3 py-2 transition hover:bg-white hover:text-brand-logoBlue focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                        href={item.href}
                                        key={item.href}
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </nav>

                            <div className="hidden items-center gap-2 lg:flex">
                                {!auth.user ? (
                                    <Link
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-brand-logoBlue transition hover:bg-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                        to="/login"
                                    >
                                        <LogIn className="h-4 w-4" aria-hidden="true" />
                                        Masuk
                                    </Link>
                                ) : null}
                                <Link
                                    className="group inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                    to={primaryTarget}
                                >
                                    {primaryLabel}
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-logoYellow text-brand-logoBlue transition group-hover:translate-x-0.5">
                                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                    </span>
                                </Link>
                            </div>

                            <button
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-logoBlue text-white shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-logoYellow lg:hidden"
                                type="button"
                                aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
                                aria-expanded={mobileMenuOpen}
                                onClick={() => setMobileMenuOpen((current) => !current)}
                            >
                                {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                            </button>
                        </div>

                        {mobileMenuOpen ? (
                            <div className="mt-4 border-t border-brand-line pt-4 lg:hidden">
                                <nav className="grid gap-2 text-sm font-semibold text-brand-steel">
                                    {navItems.map((item) => (
                                        <a
                                            className="rounded-2xl bg-brand-sky px-4 py-3 hover:text-brand-logoBlue"
                                            href={item.href}
                                            key={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {item.label}
                                        </a>
                                    ))}
                                </nav>
                                <div className="mt-4 grid gap-2">
                                    {!auth.user ? (
                                        <Link
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-brand-line bg-white text-sm font-semibold text-brand-logoBlue"
                                            to="/login"
                                        >
                                            <LogIn className="h-4 w-4" aria-hidden="true" />
                                            Masuk
                                        </Link>
                                    ) : null}
                                    <Link
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue text-sm font-semibold text-white"
                                        to={primaryTarget}
                                    >
                                        {primaryLabel}
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        ) : null}
                    </header>

                    <div className="grid min-h-[calc(100dvh-6rem)] items-center gap-10 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
                        <div className="relative z-10 max-w-2xl animate-rise-in">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white bg-white/78 px-3 py-1.5 text-sm font-semibold text-brand-steel shadow-soft backdrop-blur">
                                <ShieldCheck className="h-4 w-4 text-brand-logoYellow" aria-hidden="true" />
                                HashBox untuk mitigasi manipulasi backup
                            </div>
                            <h1 className="mt-6 font-display text-[clamp(2.45rem,10vw,4.5rem)] font-semibold leading-[1.02] text-brand-logoBlue lg:text-7xl">
                                Immutable storage yang tetap efisien untuk file cadangan.
                            </h1>
                            <p className="mt-6 max-w-xl text-lg leading-8 text-brand-steel">
                                HashBox menggabungkan Content-Addressable Storage, FastCDC, dan pemisahan domain kontrol agar data cadangan lebih tahan terhadap manipulasi ransomware tanpa memboroskan kapasitas.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue px-6 text-base font-semibold text-white shadow-deck transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-logoYellow focus:ring-offset-2"
                                    to={primaryTarget}
                                >
                                    {primaryLabel}
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-logoYellow text-brand-logoBlue transition group-hover:translate-x-0.5">
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                </Link>
                                {!auth.user ? (
                                    <Link
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-brand-line bg-white px-6 text-base font-semibold text-brand-logoBlue shadow-soft transition hover:-translate-y-0.5 hover:border-brand-logoYellow focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                        to="/login"
                                    >
                                        Masuk ke akun
                                    </Link>
                                ) : null}
                            </div>
                        </div>

                        <div className="relative min-h-[23rem] sm:min-h-[33rem] lg:min-h-[38rem]">
                            <div className="absolute right-4 top-3 hidden w-[68%] -rotate-6 rounded-[2rem] border border-white bg-white/70 p-3 shadow-deck lg:block">
                                <img
                                    src="/hashbox-cas-pipeline.png"
                                    alt="Ilustrasi pipeline CAS dan FastCDC HashBox"
                                    className="h-48 w-full rounded-[1.35rem] object-cover"
                                    onError={(event) => {
                                        event.currentTarget.src = "/auth-immutable-storage.png";
                                    }}
                                />
                            </div>
                            <div className="relative ml-auto mt-6 max-w-2xl rounded-[1.75rem] border border-white bg-white p-2 shadow-deck sm:mt-10 sm:rotate-2 sm:rounded-[2.25rem] sm:p-3">
                                <img
                                    src="/hashbox-mascot-landing-hero.png"
                                    alt="Maskot robot HashBox menjaga vault penyimpanan immutable"
                                    className="h-[19rem] w-full rounded-[1.25rem] object-cover object-center sm:h-[31rem] sm:rounded-[1.65rem]"
                                    onError={(event) => {
                                        event.currentTarget.src = "/hashbox-mascot-hero.png";
                                    }}
                                />
                                <div className="absolute -bottom-7 left-6 right-6 hidden grid-cols-3 gap-2 rounded-[1.5rem] border border-brand-line bg-white/92 p-3 shadow-deck backdrop-blur sm:grid">
                                    {proofPoints.map((point) => (
                                        <div className="min-w-0 rounded-2xl bg-brand-sky px-3 py-3" key={point.value}>
                                            <p className="font-display text-lg font-semibold text-brand-logoBlue">{point.value}</p>
                                            <p className="truncate text-xs font-semibold text-brand-steel">{point.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-brand-logoBlue py-10 text-white">
                <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-3 sm:px-7 lg:px-8">
                    {proofPoints.map((point) => (
                        <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur" key={point.value}>
                            <p className="font-display text-3xl font-semibold text-brand-logoYellow">{point.value}</p>
                            <h2 className="mt-2 font-display text-lg font-semibold">{point.title}</h2>
                            <p className="mt-2 text-sm leading-6 text-white/68">{point.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-white py-12 sm:py-20">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                        <div>
                            <SectionKicker>Masalah Backup Mutable</SectionKicker>
                            <h2 className={sectionHeadingClass}>
                                Ransomware tidak hanya mengunci data, tetapi juga menyerang repositori cadangan.
                            </h2>
                        </div>
                        <p className="text-sm leading-6 text-brand-steel sm:text-base sm:leading-7">
                            HashBox dirancang untuk mencegah manipulasi cadangan melalui jalur aplikasi yang diretas, sambil menghindari pemborosan kapasitas pada pendekatan write-once konvensional.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        {threatCards.map((item, index) => (
                            <FeatureCard item={item} tone={index === 1 ? "yellow" : "light"} key={item.title} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative overflow-hidden bg-brand-sky py-12 sm:py-20" id="solusi">
                <div className="pointer-events-none absolute -right-20 top-12 h-80 w-80 rounded-full bg-brand-logoYellow/20 blur-3xl" />
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="grid gap-6 lg:grid-cols-[0.95fr_0.8fr] lg:items-end">
                        <div>
                            <SectionKicker>Solusi HashBox</SectionKicker>
                            <h2 className={sectionHeadingClass}>
                                CAS dan FastCDC membuat objek sulit dimanipulasi dan lebih hemat ruang.
                            </h2>
                        </div>
                        <p className="max-w-xl text-sm leading-6 text-brand-steel sm:text-base sm:leading-7 lg:justify-self-end">
                            Setiap file dipecah menjadi chunk berbasis konten, diberi identitas hash, lalu hanya chunk baru yang disimpan. Metadata aplikasi tetap fleksibel, tetapi penyimpanan fisik dijaga immutable di Vault Core.
                        </p>
                    </div>
                    <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
                        <div className="overflow-hidden rounded-[1.75rem] border border-white bg-white p-3 shadow-deck">
                            <img
                                src="/hashbox-mascot-file-guide.png"
                                alt="Maskot robot HashBox mengorganisasi file ke workspace aman"
                                className="h-full min-h-[24rem] w-full rounded-[1.35rem] object-cover"
                                onError={(event) => {
                                    event.currentTarget.src = "/hashbox-mascot-guide.png";
                                }}
                            />
                        </div>
                        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                            {solutionCards.map((item, index) => (
                                <FeatureCard
                                    item={item}
                                    tone={index === 0 ? "blue" : index === 1 ? "mint" : "yellow"}
                                    className="min-h-0"
                                    key={item.title}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white py-12 sm:py-20" id="fitur">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                        <div className="max-w-3xl">
                            <SectionKicker>Fitur Utama</SectionKicker>
                            <h2 className={sectionHeadingClass}>
                                Antarmuka web tetap sederhana, tetapi menampilkan alur teknis yang penting.
                            </h2>
                        </div>
                        <p className="max-w-md text-sm leading-6 text-brand-steel sm:text-base sm:leading-7">
                            UI berfungsi untuk autentikasi, direktori logis, upload, metadata keamanan, soft delete, restore, dan retrieval dalam satu alur kerja.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-5 lg:grid-cols-[0.85fr_1.55fr] lg:items-stretch">
                        <article className="relative overflow-hidden rounded-[1.5rem] border border-brand-logoBlue bg-brand-logoBlue p-5 text-white shadow-soft sm:rounded-[2rem] sm:p-6">
                            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-logoYellow/20" />
                            <img
                                src="/hashbox-mascot-guide.png"
                                alt="Maskot robot HashBox memandu fitur penyimpanan aman"
                                className="aspect-[4/3] w-full rounded-[1.35rem] bg-white/8 object-cover shadow-soft lg:aspect-square"
                                onError={(event) => {
                                    event.currentTarget.src = "/auth-immutable-storage.png";
                                }}
                            />
                            <h3 className="mt-5 font-display text-xl font-semibold leading-tight">Robot HashBox sebagai pemandu workspace</h3>
                            <p className="mt-3 text-sm leading-6 text-white/72">
                                Maskot membantu memperkenalkan alur upload, folder, metadata keamanan, dan pemulihan dalam satu pengalaman yang mudah diikuti.
                            </p>
                        </article>
                        <div className="grid gap-5 md:grid-cols-2">
                            {demoFeatures.map((item, index) => (
                                <FeatureCard
                                    item={item}
                                    tone={index === 1 || index === 4 ? "mint" : index === 2 ? "yellow" : "light"}
                                    key={item.title}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-brand-logoBlue py-12 text-white sm:py-20" id="arsitektur">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                        <div>
                            <SectionKicker>Arsitektur</SectionKicker>
                            <h2 className={darkSectionHeadingClass}>
                                Environment A melayani aplikasi. Environment B menjaga objek.
                            </h2>
                            <p className="mt-4 text-sm leading-6 text-white/72 sm:mt-5 sm:text-base sm:leading-7">
                                Pemisahan domain kontrol menjadi garis pertahanan utama. Aplikasi boleh mengelola metadata dinamis, sedangkan Vault Core mengelola chunk, manifest, hash, dan rekonstruksi objek.
                            </p>
                            <img
                                src="/hashbox-cas-pipeline.png"
                                alt="Pipeline chunking, hashing, deduplikasi, manifest, dan Vault Core"
                                className="mt-8 aspect-[16/9] w-full rounded-[2rem] border border-white/12 object-cover shadow-deck"
                                onError={(event) => {
                                    event.currentTarget.src = "/auth-immutable-storage.png";
                                }}
                            />
                        </div>
                        <div className="grid gap-4">
                            {architectureSteps.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <article
                                        className="group relative overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur transition hover:bg-white/12"
                                        key={step.title}
                                    >
                                        <div className="flex gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-logoYellow text-brand-logoBlue">
                                                <Icon className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-xs font-semibold text-brand-logoYellow">0{index + 1}</p>
                                                <h3 className="mt-1 font-display text-xl font-semibold text-white">{step.title}</h3>
                                                <p className="mt-2 text-sm leading-6 text-white/68">{step.description}</p>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white py-12 sm:py-20" id="validasi">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                        <div>
                            <SectionKicker>Validasi Sistem</SectionKicker>
                            <h2 className={sectionHeadingClass}>
                                Pengujian diarahkan pada ketahanan dan efisiensi, bukan sekadar tampilan.
                            </h2>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            {validationCards.map((item, index) => (
                                <FeatureCard item={item} tone={index === 0 ? "mint" : index === 3 ? "blue" : "light"} key={item.title} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-brand-sky py-12 sm:py-20">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                        <div>
                            <SectionKicker>Ruang Lingkup</SectionKicker>
                            <h2 className={sectionHeadingClass}>
                                Batasan sistem dibuat jelas agar pengguna memahami kemampuan yang tersedia.
                            </h2>
                        </div>
                        <div className="grid gap-3">
                            {scopeNotes.map((note) => (
                                <div className="flex gap-3 rounded-[1.4rem] border border-brand-line bg-white p-4 shadow-soft" key={note}>
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-success" aria-hidden="true" />
                                    <p className="text-sm leading-6 text-brand-steel">{note}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white py-12 sm:py-20">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="overflow-hidden rounded-[1.6rem] bg-brand-logoBlue shadow-deck sm:rounded-[2.25rem] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="p-5 text-white sm:p-10 lg:p-12">
                            <SectionKicker>Untuk Pengguna dan Admin</SectionKicker>
                            <h2 className={darkSectionHeadingClass}>
                                Satu workspace untuk alur simpan, pantau, dan pulihkan.
                            </h2>
                            <p className="mt-4 text-sm leading-6 text-white/72 sm:mt-5 sm:text-base sm:leading-7">
                                Pengguna mendapatkan workspace file pribadi. Admin mendapatkan konteks aktivitas, storage, sistem, dan ringkasan kondisi aplikasi.
                            </p>
                            <div className="mt-6 grid max-w-xl gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                                {[
                                    { label: "Pengguna", icon: Users },
                                    { label: "Retrieval", icon: Download },
                                    { label: "Insight", icon: Search }
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/18 bg-white/8 px-4 py-3 backdrop-blur sm:min-h-[5.25rem] sm:flex-col sm:items-start sm:justify-center sm:rounded-[1.4rem] sm:p-4" key={item.label}>
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8">
                                                <Icon className="h-4 w-4 text-brand-logoYellow sm:h-5 sm:w-5" aria-hidden="true" />
                                            </span>
                                            <p className="min-w-0 font-display text-base font-semibold leading-tight sm:text-lg">{item.label}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <img
                            src="/hashbox-user-admin-workflow.png"
                            alt="Mockup dashboard HashBox untuk pengguna dan admin"
                            className="aspect-[16/10] w-full bg-white object-contain lg:h-full lg:min-h-80 lg:object-cover"
                            onError={(event) => {
                                event.currentTarget.src = "/landing-secure-storage.png";
                            }}
                        />
                    </div>
                </div>
            </section>

            <section className="bg-brand-sky py-12 sm:py-20" id="faq">
                <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-7 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
                    <div>
                        <SectionKicker>FAQ</SectionKicker>
                        <h2 className={sectionHeadingClass}>
                            Jawaban singkat tentang HashBox dan arsitektur penyimpanan immutable.
                        </h2>
                    </div>
                    <div className="grid gap-4">
                        {faqs.map((faq) => (
                            <article className="rounded-[1.5rem] border border-brand-line bg-white p-5 shadow-soft" key={faq.question}>
                                <h3 className="font-display text-xl font-semibold text-brand-logoBlue">{faq.question}</h3>
                                <p className="mt-2 text-sm leading-6 text-brand-steel">{faq.answer}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-white py-16">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="relative overflow-hidden rounded-[1.5rem] border border-brand-line bg-brand-logoYellow p-6 text-brand-logoBlue shadow-deck sm:rounded-[2rem] sm:p-10">
                        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/35" />
                        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center lg:grid-cols-[1fr_16rem_auto]">
                            <div>
                                <h2 className="max-w-3xl break-words font-display text-[clamp(1.85rem,8.2vw,2.75rem)] font-semibold leading-tight lg:text-5xl">
                                    Mulai kelola penyimpanan immutable di HashBox.
                                </h2>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-logoBlue/76 sm:text-base">
                                    Buat akun, unggah file, lihat metadata keamanan, lalu uji bagaimana soft delete dan retrieval tetap mengikuti batasan arsitektur immutable.
                                </p>
                            </div>
                            <img
                                src="/hashbox-mascot-cta.png"
                                alt="Maskot robot HashBox mengajak pengguna mulai memakai penyimpanan immutable"
                                className="hidden h-52 w-full rounded-[1.4rem] bg-white/30 object-cover shadow-soft lg:block"
                                onError={(event) => {
                                    event.currentTarget.src = "/hashbox-mascot-hero.png";
                                }}
                            />
                            <Link
                                className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue px-6 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-white sm:w-auto"
                                to={primaryTarget}
                            >
                                {primaryLabel}
                                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="bg-brand-logoBlue py-8 text-white sm:py-10">
                <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
                    <div className="flex max-w-md flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
                        <LogoMark compact />
                        <div className="min-w-0">
                            <p className="font-display text-xl font-semibold leading-tight sm:text-lg">HashBox</p>
                            <p className="mt-1 max-w-[17rem] text-sm leading-6 text-white/68 sm:mt-0 sm:max-w-none">
                                Immutable Object Storage berbasis CAS dan FastCDC.
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:justify-items-end">
                        <nav className="grid grid-cols-2 gap-2 text-sm font-semibold text-white/78 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-4 sm:gap-y-2">
                            {navItems.map((item, index) => (
                                <a
                                    className={`rounded-2xl bg-white/8 px-4 py-2 text-center transition hover:bg-white/12 hover:text-white sm:bg-transparent sm:p-0 ${index === navItems.length - 1 ? "col-span-2" : ""}`}
                                    href={item.href}
                                    key={item.href}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                        <Link className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-brand-logoYellow px-5 text-sm font-semibold text-brand-logoBlue shadow-soft transition hover:bg-[#ffbd45] hover:text-brand-logoBlue sm:h-auto sm:w-fit sm:px-4 sm:py-2" to={primaryTarget}>
                            {primaryLabel}
                        </Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
