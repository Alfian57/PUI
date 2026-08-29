import { FeatureCard } from "@/pages/landing/_components/FeatureCard";
import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { demoFeatures } from "@/pages/landing/content";
import { sectionHeadingClass } from "@/pages/landing/styles";
import { LANDING_SECTION_IDS } from "@/app/routes";

export function FeaturesSection(): JSX.Element {
    return (
        <section className="bg-white py-12 sm:py-20" id={LANDING_SECTION_IDS.features}>
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
    );
}
