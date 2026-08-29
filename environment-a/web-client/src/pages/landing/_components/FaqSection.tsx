import { faqs } from "@/pages/landing/content";
import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { sectionHeadingClass } from "@/pages/landing/styles";
import { LANDING_SECTION_IDS } from "@/app/routes";

export function FaqSection(): JSX.Element {
    return (
        <section className="bg-brand-sky py-12 sm:py-20" id={LANDING_SECTION_IDS.faq}>
            <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-7 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
                <div>
                    <SectionKicker>FAQ</SectionKicker>
                    <h2 className={sectionHeadingClass}>
                        Jawaban singkat tentang HashBox dan arsitektur penyimpanan immutable.
                    </h2>
                </div>
                <div className="grid gap-4">
                    {faqs.map((faq) => (
                        <article className="rounded-[1.5rem] border border-brand-line bg-white p-5 shadow-soft" key={faq.question}>
                            <h3 className="font-display text-xl font-semibold text-brand-logoBlue">{faq.question}</h3>
                            <p className="mt-2 text-sm leading-6 text-brand-steel">{faq.answer}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
