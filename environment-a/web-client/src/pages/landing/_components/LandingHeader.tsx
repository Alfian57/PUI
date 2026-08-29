import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LogIn, Menu, X } from "lucide-react";
import { handleSectionNavigation, navItems } from "@/pages/landing/navigation";
import type { LandingActionProps } from "@/pages/landing/types";
import { LogoMark } from "@/pages/landing/_components/LogoMark";
import { ROUTES } from "@/app/routes";

export function LandingHeader({ isAuthenticated, primaryTarget, primaryLabel }: LandingActionProps): JSX.Element {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-5 z-30 rounded-[1.75rem] border border-white/80 bg-white/86 px-4 py-3 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
                <Link to={ROUTES.home} aria-label="HashBox home">
                    <LogoMark />
                </Link>

                <nav className="hidden items-center gap-1 rounded-2xl bg-brand-sky/70 p-1 text-sm font-semibold text-brand-steel lg:flex">
                    {navItems.map((item) => (
                        <a
                            className="rounded-xl px-3 py-2 transition hover:bg-white hover:text-brand-logoBlue focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                            href={item.href}
                            key={item.href}
                            onClick={(event) => handleSectionNavigation(event, item.href)}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    {!isAuthenticated ? (
                        <Link
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-brand-logoBlue transition hover:bg-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                            to={ROUTES.auth.login}
                        >
                            <LogIn className="h-4 w-4" aria-hidden="true" />
                            Masuk
                        </Link>
                    ) : null}
                    <Link
                        className="group inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                        to={primaryTarget}
                    >
                        {primaryLabel}
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-logoYellow text-brand-logoBlue transition group-hover:translate-x-0.5">
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                    </Link>
                </div>

                <button
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-logoBlue text-white shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-logoYellow lg:hidden"
                    type="button"
                    aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
                    aria-expanded={mobileMenuOpen}
                    onClick={() => setMobileMenuOpen((current) => !current)}
                >
                    {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </button>
            </div>

            {mobileMenuOpen ? (
                <div className="mt-4 border-t border-brand-line pt-4 lg:hidden">
                    <nav className="grid gap-2 text-sm font-semibold text-brand-steel">
                        {navItems.map((item) => (
                            <a
                                className="rounded-2xl bg-brand-sky px-4 py-3 hover:text-brand-logoBlue"
                                href={item.href}
                                key={item.href}
                                onClick={(event) => handleSectionNavigation(event, item.href, () => setMobileMenuOpen(false))}
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>
                    <div className="mt-4 grid gap-2">
                        {!isAuthenticated ? (
                            <Link
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-brand-line bg-white text-sm font-semibold text-brand-logoBlue"
                                to={ROUTES.auth.login}
                            >
                                <LogIn className="h-4 w-4" aria-hidden="true" />
                                Masuk
                            </Link>
                        ) : null}
                        <Link
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-logoBlue text-sm font-semibold text-white"
                            to={primaryTarget}
                        >
                            {primaryLabel}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            ) : null}
        </header>
    );
}
