import { FeatureCard } from "@/pages/landing/_components/FeatureCard";
import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { solutionCards } from "@/pages/landing/content";
import { sectionHeadingClass } from "@/pages/landing/styles";
import { LANDING_SECTION_IDS } from "@/app/routes";

export function SolutionSection(): JSX.Element {
    return (
        <section className="relative overflow-hidden bg-brand-sky py-12 sm:py-20" id={LANDING_SECTION_IDS.solution}>
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
    );
}
