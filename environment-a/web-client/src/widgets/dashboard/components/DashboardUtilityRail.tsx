import { ArrowRight, CircleHelp, X } from "lucide-react";
import type { AuthUser } from "@/shared/types/domain";
import { useState } from "react";

type DashboardUtilityRailProps = {
    user: AuthUser;
    variant?: "user" | "admin";
    onStartTour: () => void;
};

export function DashboardUtilityRail({ user, onStartTour }: DashboardUtilityRailProps): JSX.Element {
    const [open, setOpen] = useState(false);
    const firstName = user.full_name.split(" ")[0];

    function handleStartTour(): void {
        setOpen(false);
        onStartTour();
    }

    return (
        <>
            {open ? (
                <button
                    type="button"
                    className="fixed inset-0 z-30 bg-brand-logoBlue/20 backdrop-blur-[2px] sm:hidden"
                    aria-label="Tutup bantuan"
                    onClick={() => setOpen(false)}
                />
            ) : null}

            <div className="group fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6 lg:bottom-7 lg:right-7">
                <div className="pointer-events-none absolute bottom-20 right-0 hidden w-72 translate-y-2 scale-95 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100 sm:block">
                    <div className="overflow-hidden rounded-[1.5rem] bg-white p-3 shadow-deck ring-1 ring-brand-line/70">
                        <div className="flex items-center gap-3">
                            <img
                                src="/hashbox-mascot-help-fab.png"
                                alt="Maskot bantuan HashBox"
                                className="h-20 w-20 shrink-0 rounded-2xl bg-brand-sky object-cover"
                                onError={(event) => {
                                    event.currentTarget.src = "/hashbox-mascot-cta.png";
                                }}
                            />
                            <div>
                                <p className="font-display text-base font-semibold leading-tight text-brand-logoBlue">Butuh bantuan, {firstName}?</p>
                                <p className="mt-1 text-xs leading-5 text-brand-steel">Klik untuk membuka panduan cepat dashboard HashBox.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {open ? (
                    <section className="absolute bottom-20 right-0 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-[1.75rem] bg-white shadow-deck ring-1 ring-brand-line/70">
                        <div className="relative bg-brand-logoBlue p-5 text-white">
                            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-logoYellow/20" />
                            <button
                                type="button"
                                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
                                aria-label="Tutup panel bantuan"
                                onClick={() => setOpen(false)}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <div className="relative pr-10">
                                <img
                                    src="/hashbox-mascot-help-fab.png"
                                    alt="Maskot bantuan HashBox"
                                    className="h-28 w-28 rounded-3xl bg-white/8 object-cover shadow-soft"
                                    onError={(event) => {
                                        event.currentTarget.src = "/hashbox-mascot-cta.png";
                                    }}
                                />
                                <h2 className="mt-4 font-display text-2xl font-semibold leading-tight">Halo, {firstName}. Mari kenali dashboard HashBox.</h2>
                                <p className="mt-2 text-sm leading-6 text-white/72">Tur interaktif akan menyorot menu dan alur utama agar Anda cepat memahami area kerja.</p>
                            </div>
                        </div>
                        <div className="p-4">
                            <section className="rounded-2xl bg-brand-logoYellow/12 p-4 ring-1 ring-brand-logoYellow/35">
                                <p className="font-display text-base font-semibold text-brand-logoBlue">Panduan interaktif</p>
                                <p className="mt-1 text-sm leading-6 text-brand-steel">Ikuti tur singkat yang akan menyorot menu, pencarian, dan alur utama dashboard.</p>
                                <button
                                    type="button"
                                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                    onClick={handleStartTour}
                                >
                                    Mulai tur dashboard
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </section>
                        </div>
                    </section>
                ) : null}

                <button
                    type="button"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-logoBlue text-brand-logoYellow shadow-deck ring-1 ring-white/20 transition hover:-translate-y-1 hover:scale-105 hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                    aria-label={`Butuh bantuan, ${firstName}?`}
                    aria-expanded={open}
                    title={`Butuh bantuan, ${firstName}?`}
                    onClick={() => setOpen((current) => !current)}
                >
                    <CircleHelp className="h-6 w-6" aria-hidden="true" />
                </button>
            </div>
        </>
    );
}
