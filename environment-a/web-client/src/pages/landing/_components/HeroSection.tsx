import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { proofPoints } from "@/pages/landing/content";
import type { LandingActionProps } from "@/pages/landing/types";
import { ROUTES } from "@/app/routes";
import { LandingHeader } from "@/pages/landing/_components/LandingHeader";

export function HeroSection({ isAuthenticated, primaryTarget, primaryLabel }: LandingActionProps): JSX.Element {
    return (
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
                <LandingHeader isAuthenticated={isAuthenticated} primaryTarget={primaryTarget} primaryLabel={primaryLabel} />

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
                            {!isAuthenticated ? (
                                <Link
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-brand-line bg-white px-6 text-base font-semibold text-brand-logoBlue shadow-soft transition hover:-translate-y-0.5 hover:border-brand-logoYellow focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                                    to={ROUTES.auth.login}
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
    );
}
