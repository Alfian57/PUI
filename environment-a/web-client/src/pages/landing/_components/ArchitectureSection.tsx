import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { architectureSteps } from "@/pages/landing/content";
import { darkSectionHeadingClass } from "@/pages/landing/styles";
import { LANDING_SECTION_IDS } from "@/app/routes";

export function ArchitectureSection(): JSX.Element {
    return (
        <section className="bg-brand-logoBlue py-12 text-white sm:py-20" id={LANDING_SECTION_IDS.architecture}>
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
    );
}
