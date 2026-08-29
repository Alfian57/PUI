import { ActivityDrawer } from "@/pages/dashboard/activity/_components/ActivityDrawer";

export function ActivityPage(): JSX.Element {
    return (
        <div className="space-y-5">
            <section>
                <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Riwayat</h1>
                <p className="mt-1 text-sm text-brand-steel">Pantau aktivitas terbaru pada akun HashBox Anda.</p>
            </section>
            <ActivityDrawer />
        </div>
    );
}
