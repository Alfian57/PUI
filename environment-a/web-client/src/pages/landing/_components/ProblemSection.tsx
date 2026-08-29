import { FeatureCard } from "@/pages/landing/_components/FeatureCard";
import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { threatCards } from "@/pages/landing/content";
import { sectionHeadingClass } from "@/pages/landing/styles";

export function ProblemSection(): JSX.Element {
    return (
        <section className="bg-white py-12 sm:py-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                    <div>
                        <SectionKicker>Masalah Backup Mutable</SectionKicker>
                        <h2 className={sectionHeadingClass}>
                            Ransomware tidak hanya mengunci data, tetapi juga menyerang repositori cadangan.
                        </h2>
                    </div>
                    <p className="text-sm leading-6 text-brand-steel sm:text-base sm:leading-7">
                        HashBox dirancang untuk mencegah manipulasi cadangan melalui jalur aplikasi yang diretas, sambil menghindari pemborosan kapasitas pada pendekatan write-once konvensional.
                    </p>
                </div>
                <div className="mt-10 grid gap-5 md:grid-cols-3">
                    {threatCards.map((item, index) => (
                        <FeatureCard item={item} tone={index === 1 ? "yellow" : "light"} key={item.title} />
                    ))}
                </div>
            </div>
        </section>
    );
}
