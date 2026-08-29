import { audienceCards } from "@/pages/landing/content";
import { SectionKicker } from "@/pages/landing/_components/SectionKicker";
import { darkSectionHeadingClass } from "@/pages/landing/styles";

export function AudienceSection(): JSX.Element {
    return (
        <section className="bg-white py-12 sm:py-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
                <div className="overflow-hidden rounded-[1.6rem] bg-brand-logoBlue shadow-deck sm:rounded-[2.25rem] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="p-5 text-white sm:p-10 lg:p-12">
                        <SectionKicker>Untuk Pengguna dan Admin</SectionKicker>
                        <h2 className={darkSectionHeadingClass}>
                            Satu workspace untuk alur simpan, pantau, dan pulihkan.
                        </h2>
                        <p className="mt-4 text-sm leading-6 text-white/72 sm:mt-5 sm:text-base sm:leading-7">
                            Pengguna mendapatkan workspace file pribadi. Admin mendapatkan konteks aktivitas, storage, sistem, dan ringkasan kondisi aplikasi.
                        </p>
                        <div className="mt-6 grid max-w-xl gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                            {audienceCards.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/18 bg-white/8 px-4 py-3 backdrop-blur sm:min-h-[5.25rem] sm:flex-col sm:items-start sm:justify-center sm:rounded-[1.4rem] sm:p-4" key={item.label}>
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8">
                                            <Icon className="h-4 w-4 text-brand-logoYellow sm:h-5 sm:w-5" aria-hidden="true" />
                                        </span>
                                        <p className="min-w-0 font-display text-base font-semibold leading-tight sm:text-lg">{item.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <img
                        src="/hashbox-user-admin-workflow.png"
                        alt="Mockup dashboard HashBox untuk pengguna dan admin"
                        className="aspect-[16/10] w-full bg-white object-contain lg:h-full lg:min-h-80 lg:object-cover"
                        onError={(event) => {
                            event.currentTarget.src = "/landing-secure-storage.png";
                        }}
                    />
                </div>
            </div>
        </section>
    );
}
