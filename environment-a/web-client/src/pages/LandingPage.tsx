import { Link } from "react-router-dom";
import {
    Activity,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Database,
    Download,
    Files,
    FolderLock,
    Gauge,
    Layers3,
    LogIn,
    Network,
    Search,
    Server,
    ShieldCheck,
    UploadCloud,
    Users
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";

const navItems = [
    { label: "Fitur", href: "#fitur" },
    { label: "Cara Kerja", href: "#cara-kerja" },
    { label: "Keamanan", href: "#keamanan" },
    { label: "FAQ", href: "#faq" }
];

const proofPoints = [
    {
        title: "Immutable",
        description: "Konten file disimpan dengan pendekatan content-addressable."
    },
    {
        title: "Terstruktur",
        description: "Folder, starred, dan trash menjaga workspace tetap mudah dipakai."
    },
    {
        title: "Terpantau",
        description: "Aktivitas dan insight membantu pengguna memahami file mereka."
    }
];

const painPoints = [
    {
        title: "File penting mudah tercecer",
        description: "Dokumen tersebar di banyak folder lokal, chat, dan perangkat tanpa struktur yang jelas.",
        icon: Files
    },
    {
        title: "Riwayat sulit ditelusuri",
        description: "Saat file diunduh, dihapus, atau dipulihkan, pengguna butuh jejak aktivitas yang bisa dicek ulang.",
        icon: Activity
    },
    {
        title: "Storage tidak terlihat efisien",
        description: "Tanpa insight chunk dan dedup, penggunaan ruang penyimpanan sulit dipahami dari sisi pengguna.",
        icon: Gauge
    }
];

const benefits = [
    {
        title: "Aman sejak upload",
        description: "File masuk ke ruang penyimpanan immutable dengan akses akun yang jelas.",
        icon: ShieldCheck
    },
    {
        title: "Rapi dalam folder",
        description: "Susun dokumen penting di direktori pribadi agar mudah ditemukan kembali.",
        icon: FolderLock
    },
    {
        title: "Aktivitas terlacak",
        description: "Upload, unduh, hapus, dan pulihkan file terlihat dalam riwayat penggunaan.",
        icon: Activity
    },
    {
        title: "Storage efisien",
        description: "Insight chunk dan dedup membantu memahami penggunaan ruang penyimpanan.",
        icon: Database
    }
];

const workflowSteps = [
    {
        title: "Upload file",
        description: "Tambahkan file ke folder yang tepat dan pantau status penyimpanannya.",
        icon: UploadCloud
    },
    {
        title: "Simpan immutable",
        description: "Konten diproses sebagai object immutable di vault-core, terpisah dari metadata aplikasi.",
        icon: Layers3
    },
    {
        title: "Temukan kembali",
        description: "Navigasi folder, file berbintang, dan trash membuat dokumen tidak mudah hilang.",
        icon: Search
    },
    {
        title: "Pantau insight",
        description: "Lihat aktivitas, tipe file, penggunaan storage, dan informasi dedup yang relevan.",
        icon: BarChart3
    }
];

const featureGroups = [
    {
        title: "Workspace pengguna",
        description: "Alur harian untuk menyimpan, mengambil, dan merapikan file pribadi.",
        icon: FolderLock,
        items: [
            "Folder pribadi untuk memisahkan dokumen kerja, arsip, dan file penting.",
            "Upload dan download file dari ruang kerja yang sama.",
            "Starred dan trash membantu menjaga workspace tetap terkendali."
        ]
    },
    {
        title: "Kontrol file",
        description: "Status file dan tindakan umum dibuat eksplisit di antarmuka.",
        icon: Files,
        items: [
            "Metadata file menampilkan nama, tipe, ukuran, dan status penyimpanan.",
            "Soft delete menjaga item tetap bisa ditinjau sebelum benar-benar hilang dari alur kerja.",
            "Panel detail membantu memahami file tanpa berpindah konteks."
        ]
    },
    {
        title: "Insight dan aktivitas",
        description: "Pengguna dan admin punya konteks untuk memahami penggunaan storage.",
        icon: Activity,
        items: [
            "Activity log menampilkan tindakan penting seperti login, upload, download, dan restore.",
            "Insight pengguna menampilkan ringkasan file aktif, trash, starred, dan storage.",
            "Admin analytics memberi gambaran aktivitas, storage, sistem, dan laporan."
        ]
    }
];

const architecturePoints = [
    {
        title: "Web dan API metadata",
        description: "Environment A menangani UI, autentikasi, direktori, metadata file, dan akses API publik.",
        icon: Server
    },
    {
        title: "Vault-core terpisah",
        description: "Environment B menyimpan konten immutable melalui content-addressable storage.",
        icon: Database
    },
    {
        title: "Komunikasi UDS",
        description: "API service berkomunikasi ke vault-core lewat Unix Domain Socket untuk operasi konten file.",
        icon: Network
    },
    {
        title: "Chunking dan dedup",
        description: "FastCDC dan manifest immutable membantu penyimpanan konten lebih efisien.",
        icon: Layers3
    }
];

const useCases = [
    {
        title: "Pengguna individu",
        description: "Menyimpan dokumen penting dalam folder pribadi, menandai file prioritas, dan memulihkan item dari trash.",
        icon: Users
    },
    {
        title: "Tim operasional",
        description: "Menjaga arsip kerja tetap rapi dengan aktivitas yang mudah ditinjau kembali.",
        icon: Download
    },
    {
        title: "Admin sistem",
        description: "Memantau aktivitas, storage, laporan, dan status sistem dari dashboard analytics.",
        icon: BarChart3
    }
];

const faqs = [
    {
        question: "Apa maksud penyimpanan immutable di HashBox?",
        answer: "Konten file diproses sebagai object immutable di vault-core. Metadata seperti folder, nama file, starred, dan trash tetap dikelola oleh API metadata."
    },
    {
        question: "Apakah HashBox hanya untuk admin?",
        answer: "Tidak. Pengguna dapat mengelola file pribadi, sementara admin memiliki dashboard tambahan untuk analytics, storage, aktivitas, sistem, dan laporan."
    },
    {
        question: "Apakah file yang dihapus langsung hilang?",
        answer: "Alur aplikasi memakai soft delete metadata, sehingga item dapat muncul di trash dan dipulihkan sesuai fitur yang tersedia di workspace."
    },
    {
        question: "Insight storage menampilkan apa?",
        answer: "Insight menampilkan ringkasan file, folder, trash, starred, penggunaan storage, aktivitas, dan informasi chunk atau dedup yang relevan."
    }
];

export function LandingPage(): JSX.Element {
    const auth = useAuth();
    const dashboardPath = auth.user?.role === "admin" ? "/app/analytics" : "/app/files";
    const primaryTarget = auth.user ? dashboardPath : "/register";
    const primaryLabel = auth.user ? "Buka dashboard" : "Daftar sekarang";

    return (
        <main className="min-h-screen bg-white text-brand-ink">
            <section className="relative isolate min-h-[88vh] overflow-hidden bg-brand-logoBlue text-white">
                <img
                    src="/landing-secure-storage.png"
                    alt="Visualisasi dashboard penyimpanan file aman HashBox"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(event) => {
                        event.currentTarget.src = "/auth-immutable-storage.png";
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-logoBlue via-brand-logoBlue/86 to-brand-logoBlue/36" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-logoBlue to-transparent" />

                <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col px-5 py-5 sm:px-7 lg:px-8">
                    <header className="flex items-center justify-between gap-4">
                        <Link className="flex min-w-0 items-center gap-3" to="/">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft">
                                <img src="/hashbox-logo.png" alt="HashBox" className="h-full w-full object-cover" />
                            </span>
                            <span className="min-w-0">
                                <span className="block font-display text-lg font-semibold leading-tight">HashBox</span>
                                <span className="block text-xs font-medium text-white/72">Penyimpanan Aman</span>
                            </span>
                        </Link>

                        <nav className="hidden items-center gap-1 rounded-2xl border border-white/16 bg-white/10 p-1 text-sm font-semibold text-white/78 backdrop-blur lg:flex">
                            {navItems.map((item) => (
                                <a
                                    className="rounded-xl px-3 py-2 transition hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                    href={item.href}
                                    key={item.href}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>

                        <div className="flex items-center gap-2">
                            {!auth.user ? (
                                <Link
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/24 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                    to="/login"
                                >
                                    <LogIn className="h-4 w-4" aria-hidden="true" />
                                    Masuk
                                </Link>
                            ) : null}
                            <Link
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-brand-logoYellow px-4 text-sm font-semibold text-brand-logoBlue shadow-soft transition hover:bg-[#ffb32d] focus:outline-none focus:ring-2 focus:ring-white"
                                to={primaryTarget}
                            >
                                {primaryLabel}
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </header>

                    <div className="flex flex-1 items-center py-14 sm:py-16 lg:py-20">
                        <div className="max-w-3xl animate-rise-in">
                            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/86 backdrop-blur">
                                <ShieldCheck className="h-4 w-4 text-brand-logoYellow" aria-hidden="true" />
                                File immutable, folder rapi, aktivitas jelas
                            </p>
                            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
                                HashBox
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
                                Simpan file penting dalam ruang kerja yang aman, mudah ditelusuri, dan tetap teratur dari upload pertama sampai arsip terakhir.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-logoYellow px-6 text-base font-semibold text-brand-logoBlue shadow-deck transition hover:-translate-y-0.5 hover:bg-[#ffb32d] focus:outline-none focus:ring-2 focus:ring-white"
                                    to={primaryTarget}
                                >
                                    {primaryLabel}
                                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                </Link>
                                {!auth.user ? (
                                    <Link
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/24 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                        to="/login"
                                    >
                                        Masuk ke akun
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-brand-logoBlue py-10 text-white">
                <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-3 sm:px-7 lg:px-8">
                    {proofPoints.map((point) => (
                        <div className="border-l border-brand-logoYellow/70 pl-4" key={point.title}>
                            <p className="font-display text-3xl font-semibold">{point.title}</p>
                            <p className="mt-1 text-sm text-white/70">{point.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                        <div>
                            <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-logoYellow">
                                Masalah yang Diselesaikan
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-logoBlue sm:text-4xl">
                                File penting butuh ruang yang aman, rapi, dan bisa diaudit.
                            </h2>
                            <p className="mt-4 text-base leading-7 text-brand-steel">
                                HashBox dirancang untuk mengurangi kekacauan penyimpanan file tanpa membuat pengguna bekerja dengan alur yang rumit.
                            </p>
                        </div>
                        <div className="grid gap-4">
                            {painPoints.map((point) => {
                                const Icon = point.icon;
                                return (
                                    <article
                                        className="rounded-lg border border-brand-line bg-white p-5 shadow-soft"
                                        key={point.title}
                                    >
                                        <div className="flex gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-logoYellow/14 text-brand-logoBlue">
                                                <Icon className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <h3 className="font-display text-lg font-semibold text-brand-logoBlue">
                                                    {point.title}
                                                </h3>
                                                <p className="mt-1 text-sm leading-6 text-brand-steel">{point.description}</p>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-brand-sky py-16 sm:py-20" id="fitur">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="max-w-2xl">
                        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-logoYellow">
                            Mengapa HashBox
                        </p>
                        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-logoBlue sm:text-4xl">
                            Ruang penyimpanan yang dibuat untuk file penting, bukan sekadar tempat upload.
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {benefits.map((benefit) => {
                            const Icon = benefit.icon;
                            return (
                                <article
                                    className="rounded-lg border border-brand-line bg-white p-5 shadow-soft"
                                    key={benefit.title}
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-logoYellow/14 text-brand-logoBlue">
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-5 font-display text-lg font-semibold text-brand-logoBlue">
                                        {benefit.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-brand-steel">{benefit.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="bg-white py-16 sm:py-20" id="cara-kerja">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                        <div className="max-w-2xl">
                            <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-logoYellow">
                                Cara Kerja
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-logoBlue sm:text-4xl">
                                Dari upload sampai temu balik, semuanya tetap jelas.
                            </h2>
                        </div>
                        <p className="max-w-md text-base leading-7 text-brand-steel">
                            HashBox menggabungkan manajemen folder, penyimpanan immutable, dan catatan aktivitas dalam satu antarmuka yang ringan dipakai setiap hari.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {workflowSteps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <article
                                    className="relative rounded-lg border border-brand-line bg-white p-5 shadow-soft"
                                    key={step.title}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-logoBlue text-white">
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                        <span className="font-mono text-sm font-semibold text-brand-logoYellow">
                                            0{index + 1}
                                        </span>
                                    </div>
                                    <h3 className="mt-5 font-display text-lg font-semibold text-brand-logoBlue">
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-brand-steel">{step.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="bg-brand-sky py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="max-w-2xl">
                        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-logoYellow">
                            Fitur Lengkap
                        </p>
                        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-logoBlue sm:text-4xl">
                            Semua kebutuhan utama pengelolaan file ada di satu workspace.
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {featureGroups.map((group) => {
                            const Icon = group.icon;
                            return (
                                <article
                                    className="rounded-lg border border-brand-line bg-white p-6 shadow-soft"
                                    key={group.title}
                                >
                                    <Icon className="h-7 w-7 text-brand-logoYellow" aria-hidden="true" />
                                    <h3 className="mt-5 font-display text-xl font-semibold text-brand-logoBlue">
                                        {group.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-brand-steel">{group.description}</p>
                                    <div className="mt-5 space-y-3">
                                        {group.items.map((item) => (
                                            <p className="flex gap-3 text-sm leading-6 text-brand-steel" key={item}>
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-success" aria-hidden="true" />
                                                {item}
                                            </p>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="bg-brand-logoBlue py-16 text-white sm:py-20" id="keamanan">
                <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-7 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
                    <div>
                        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-logoYellow">
                            Keamanan & Arsitektur
                        </p>
                        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                            Dibangun dengan pemisahan metadata dan konten file.
                        </h2>
                        <p className="mt-4 text-base leading-7 text-white/72">
                            Kredibilitas HashBox datang dari arsitektur produk yang jelas: web client dan API metadata berada di Environment A, sementara vault-core menangani konten immutable di Environment B.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {architecturePoints.map((point) => {
                            const Icon = point.icon;
                            return (
                                <article
                                    className="rounded-lg border border-white/14 bg-white/8 p-5 backdrop-blur"
                                    key={point.title}
                                >
                                    <Icon className="h-7 w-7 text-brand-logoYellow" aria-hidden="true" />
                                    <h3 className="mt-4 font-display text-lg font-semibold text-white">{point.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-white/70">{point.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="max-w-2xl">
                        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-logoYellow">
                            Untuk Siapa
                        </p>
                        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-logoBlue sm:text-4xl">
                            Cocok untuk pengguna yang butuh arsip rapi dan admin yang butuh visibilitas.
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        {useCases.map((useCase) => {
                            const Icon = useCase.icon;
                            return (
                                <article
                                    className="rounded-lg border border-brand-line bg-white p-6 shadow-soft"
                                    key={useCase.title}
                                >
                                    <Icon className="h-7 w-7 text-brand-logoYellow" aria-hidden="true" />
                                    <h3 className="mt-5 font-display text-xl font-semibold text-brand-logoBlue">
                                        {useCase.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-brand-steel">{useCase.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="bg-brand-sky py-16 sm:py-20" id="faq">
                <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-7 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
                    <div>
                        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-logoYellow">
                            FAQ
                        </p>
                        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-logoBlue sm:text-4xl">
                            Jawaban singkat sebelum mulai memakai HashBox.
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq) => (
                            <article className="rounded-lg border border-brand-line bg-white p-5 shadow-soft" key={faq.question}>
                                <h3 className="font-display text-lg font-semibold text-brand-logoBlue">{faq.question}</h3>
                                <p className="mt-2 text-sm leading-6 text-brand-steel">{faq.answer}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-white py-16">
                <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                    <div className="flex flex-col items-start justify-between gap-6 border-y border-brand-line py-10 md:flex-row md:items-center">
                        <div>
                            <h2 className="font-display text-3xl font-semibold text-brand-logoBlue">
                                Mulai rapikan file penting Anda di HashBox.
                            </h2>
                            <p className="mt-3 max-w-2xl text-base leading-7 text-brand-steel">
                                Buat akun, siapkan folder pribadi, lalu simpan dokumen dengan alur yang aman dan mudah dipantau.
                            </p>
                        </div>
                        <Link
                            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue px-6 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                            to={primaryTarget}
                        >
                            {primaryLabel}
                            <ArrowRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="bg-brand-logoBlue py-8 text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                            <img src="/hashbox-logo.png" alt="HashBox" className="h-full w-full object-cover" />
                        </span>
                        <div>
                            <p className="font-display text-lg font-semibold">HashBox</p>
                            <p className="text-sm text-white/68">Penyimpanan file immutable yang aman dan rapi.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/76">
                        <a className="hover:text-white" href="#fitur">Fitur</a>
                        <a className="hover:text-white" href="#cara-kerja">Cara Kerja</a>
                        <a className="hover:text-white" href="#keamanan">Keamanan</a>
                        <a className="hover:text-white" href="#faq">FAQ</a>
                        <Link className="text-brand-logoYellow hover:text-[#ffbd45]" to={primaryTarget}>
                            {primaryLabel}
                        </Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
