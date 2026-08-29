import type { IconCard } from "@/pages/landing/types";

type FeatureCardTone = "light" | "blue" | "yellow" | "mint";

type FeatureCardProps = {
    item: IconCard;
    tone?: FeatureCardTone;
    className?: string;
};

export function FeatureCard({ item, tone = "light", className = "" }: FeatureCardProps): JSX.Element {
    const Icon = item.icon;
    const styles: Record<FeatureCardTone, string> = {
        light: "border-brand-line bg-white text-brand-logoBlue",
        blue: "border-brand-logoBlue bg-brand-logoBlue text-white",
        yellow: "border-brand-logoYellow bg-brand-logoYellow text-brand-logoBlue",
        mint: "border-brand-mint bg-brand-mint text-brand-logoBlue"
    };
    const muted = tone === "blue" ? "text-white/72" : "text-brand-steel";
    const iconBg = tone === "yellow" ? "bg-white/70 text-brand-logoBlue" : tone === "blue" ? "bg-white/12 text-brand-logoYellow" : "bg-brand-logoYellow/14 text-brand-logoBlue";

    return (
        <article className={`relative overflow-hidden rounded-[1.5rem] border p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-deck sm:rounded-[2rem] sm:p-6 ${styles[tone]} ${className}`}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full border-[18px] border-current opacity-[0.06]" />
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold leading-tight">{item.title}</h3>
            <p className={`mt-3 text-sm leading-6 ${muted}`}>{item.description}</p>
        </article>
    );
}
