import {
    Activity,
    BarChart3,
    CheckCircle2,
    Database,
    Download,
    Fingerprint,
    FolderLock,
    Gauge,
    HardDrive,
    KeyRound,
    Layers3,
    Network,
    RefreshCcw,
    Search,
    Server,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UploadCloud,
    Users
} from "lucide-react";
import type { AudienceCard, IconCard } from "@/pages/landing/types";

export const proofPoints = [
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

export const threatCards: IconCard[] = [
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

export const solutionCards: IconCard[] = [
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

export const demoFeatures: IconCard[] = [
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

export const architectureSteps: IconCard[] = [
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

export const validationCards: IconCard[] = [
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

export const scopeNotes = [
    "Fokus sistem berada pada CAS, FastCDC, deduplikasi, immutability logis, dan pemisahan otoritas single-node.",
    "Aplikasi web menyediakan antarmuka operasional untuk upload, folder, metadata keamanan, soft delete, restore, dan retrieval.",
    "Soft delete dan retensi mengubah status metadata aplikasi, bukan menghapus chunk fisik, manifest, atau referensi Vault Core.",
    "Ruang lingkup belum mencakup garbage collection fisik, high availability, replikasi terdistribusi, atau read-proxy penuh."
];

export const audienceCards: AudienceCard[] = [
    { label: "Pengguna", icon: Users },
    { label: "Retrieval", icon: Download },
    { label: "Insight", icon: Search }
];

export const faqs = [
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
