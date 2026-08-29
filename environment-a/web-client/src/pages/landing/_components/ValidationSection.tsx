import { FeatureCard } from "@/pages/landing/_components/FeatureCard";
import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { validationCards } from "@/pages/landing/content";
import { sectionHeadingClass } from "@/pages/landing/styles";
import { LANDING_SECTION_IDS } from "@/app/routes";

export function ValidationSection(): JSX.Element {
    return (
        <section className="bg-white py-12 sm:py-20" id={LANDING_SECTION_IDS.validation}>
            <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <SectionKicker>Validasi Sistem</SectionKicker>
                        <h2 className={sectionHeadingClass}>
                            Pengujian diarahkan pada ketahanan dan efisiensi, bukan sekadar tampilan.
                        </h2>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        {validationCards.map((item, index) => (
                            <FeatureCard item={item} tone={index === 0 ? "mint" : index === 3 ? "blue" : "light"} key={item.title} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
