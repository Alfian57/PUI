import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { LandingActionProps } from "@/pages/landing/types";

export function LandingCta({ primaryTarget, primaryLabel }: LandingActionProps): JSX.Element {
    return (
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
    );
}
