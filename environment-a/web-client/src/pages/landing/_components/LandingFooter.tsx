import { Link } from "react-router-dom";
import type { LandingActionProps } from "@/pages/landing/types";
import { handleSectionNavigation, navItems } from "@/pages/landing/navigation";
import { LogoMark } from "@/pages/landing/_components/LogoMark";

export function LandingFooter({ primaryTarget, primaryLabel }: LandingActionProps): JSX.Element {
    return (
        <footer className="bg-brand-logoBlue py-8 text-white sm:py-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
                <div className="flex max-w-md flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
                    <LogoMark compact />
                    <div className="min-w-0">
                        <p className="font-display text-xl font-semibold leading-tight sm:text-lg">HashBox</p>
                        <p className="mt-1 max-w-[17rem] text-sm leading-6 text-white/68 sm:mt-0 sm:max-w-none">
                            Immutable Object Storage berbasis CAS dan FastCDC.
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 sm:justify-items-end">
                    <nav className="grid grid-cols-2 gap-2 text-sm font-semibold text-white/78 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-4 sm:gap-y-2">
                        {navItems.map((item, index) => (
                            <a
                                className={`rounded-2xl bg-white/8 px-4 py-2 text-center transition hover:bg-white/12 hover:text-white sm:bg-transparent sm:p-0 ${index === navItems.length - 1 ? "col-span-2" : ""}`}
                                href={item.href}
                                key={item.href}
                                onClick={(event) => handleSectionNavigation(event, item.href)}
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>
                    <Link className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-brand-logoYellow px-5 text-sm font-semibold text-brand-logoBlue shadow-soft transition hover:bg-[#ffbd45] hover:text-brand-logoBlue sm:h-auto sm:w-fit sm:px-4 sm:py-2" to={primaryTarget}>
                        {primaryLabel}
                    </Link>
                </div>
            </div>
        </footer>
    );
}
