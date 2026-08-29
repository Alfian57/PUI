import type { Step } from "react-joyride";
import { ROUTES } from "@/app/routes";

export type DashboardTourRole = "user" | "admin";

export type DashboardTourStep = Step & {
    route?: string;
    sidebar?: boolean;
};

export const joyrideStyles = {
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

export const userTourSteps: DashboardTourStep[] = [
    { target: '[data-tour="dashboard-content"]', title: "Dashboard HashBox", content: "Ini adalah ruang kerja utama untuk mengelola penyimpanan immutable, aktivitas, dan insight berkas Anda.", placement: "center", route: ROUTES.app.files },
    { target: '[data-tour="dashboard-sidebar"]', title: "Navigasi utama", content: "Gunakan sidebar untuk berpindah antara berkas, item berbintang, sampah, riwayat, dan insight.", placement: "right", sidebar: true },
    { target: '[data-tour="sidebar-files"]', title: "Berkas Saya", content: "Mulai dari sini untuk membuat direktori, mengunggah berkas, membuka detail, dan melakukan retrieval.", placement: "right", route: ROUTES.app.files, sidebar: true },
    { target: '[data-tour="dashboard-search"]', title: "Pencarian cepat", content: "Cari berkas langsung dari topbar tanpa berpindah halaman.", placement: "bottom" },
    { target: '[data-tour="files-toolbar"]', title: "Aksi workspace", content: "Toolbar ini berisi upload, buat direktori, filter waktu, urutan, dan mode tampilan.", placement: "bottom", route: ROUTES.app.files },
    { target: '[data-tour="sidebar-insights"]', title: "Insight penyimpanan", content: "Buka insight untuk melihat efisiensi deduplikasi, aktivitas, dan komposisi berkas.", placement: "right", route: ROUTES.app.insights, sidebar: true },
    { target: '[data-tour="dashboard-account"]', title: "Akun dan profil", content: "Kelola profil atau keluar dari sesi melalui menu akun di kanan atas.", placement: "left" }
];

export const adminTourSteps: DashboardTourStep[] = [
    { target: '[data-tour="dashboard-content"]', title: "Dashboard admin", content: "Area ini menampilkan analitik agregat dan status operasional HashBox.", placement: "center", route: ROUTES.app.analytics.overview },
    { target: '[data-tour="dashboard-sidebar"]', title: "Navigasi admin", content: "Sidebar admin memisahkan analitik, penyimpanan, aktivitas, kesehatan sistem, dan laporan.", placement: "right", sidebar: true },
    { target: '[data-tour="sidebar-admin-overview"]', title: "Ikhtisar", content: "Pantau metrik utama aplikasi dari halaman ikhtisar.", placement: "right", route: ROUTES.app.analytics.overview, sidebar: true },
    { target: '[data-tour="sidebar-admin-storage"]', title: "Penyimpanan", content: "Gunakan area ini untuk melihat kapasitas, chunk, dan efisiensi storage.", placement: "right", route: ROUTES.app.analytics.storage, sidebar: true },
    { target: '[data-tour="sidebar-admin-activity"]', title: "Aktivitas", content: "Analisis tren aktivitas pengguna dan operasi file.", placement: "right", route: ROUTES.app.analytics.activity, sidebar: true },
    { target: '[data-tour="sidebar-admin-system"]', title: "Kesehatan sistem", content: "Cek kondisi operasional layanan HashBox dari menu ini.", placement: "right", route: ROUTES.app.analytics.system, sidebar: true },
    { target: '[data-tour="sidebar-admin-security"]', title: "Monitoring keamanan", content: "Lihat event serangan API, penolakan Vault Core, dan bukti Security Lab secara real-time.", placement: "right", route: ROUTES.app.analytics.security, sidebar: true },
    { target: '[data-tour="dashboard-account"]', title: "Menu akun", content: "Profil dan logout admin tersedia dari menu akun.", placement: "left" }
];

export function getDashboardTourSteps(role: DashboardTourRole): DashboardTourStep[] {
    return role === "admin" ? adminTourSteps : userTourSteps;
}

export function cleanupTourOverlay(): void {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.querySelectorAll('[id^="react-joyride"], [data-floating-ui-portal]').forEach((element) => {
        element.remove();
    });
}
