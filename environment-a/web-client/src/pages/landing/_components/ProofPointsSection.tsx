import { proofPoints } from "@/pages/landing/content";

export function ProofPointsSection(): JSX.Element {
    return (
        <section className="bg-brand-logoBlue py-10 text-white">
            <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-3 sm:px-7 lg:px-8">
                {proofPoints.map((point) => (
                    <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur" key={point.value}>
                        <p className="font-display text-3xl font-semibold text-brand-logoYellow">{point.value}</p>
                        <h2 className="mt-2 font-display text-lg font-semibold">{point.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-white/68">{point.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
