import { CheckCircle2 } from "lucide-react";
import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { scopeNotes } from "@/pages/landing/content";
import { sectionHeadingClass } from "@/pages/landing/styles";

export function ScopeSection(): JSX.Element {
    return (
        <section className="bg-brand-sky py-12 sm:py-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                    <div>
                        <SectionKicker>Ruang Lingkup</SectionKicker>
                        <h2 className={sectionHeadingClass}>
                            Batasan sistem dibuat jelas agar pengguna memahami kemampuan yang tersedia.
                        </h2>
                    </div>
                    <div className="grid gap-3">
                        {scopeNotes.map((note) => (
                            <div className="flex gap-3 rounded-[1.4rem] border border-brand-line bg-white p-4 shadow-soft" key={note}>
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-success" aria-hidden="true" />
                                <p className="text-sm leading-6 text-brand-steel">{note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
