import type { MouseEvent } from "react";
import { ROUTES } from "@/app/routes";

export const navItems = [
    { label: "Solusi", href: ROUTES.landing.sections.solution },
    { label: "Fitur", href: ROUTES.landing.sections.features },
    { label: "Arsitektur", href: ROUTES.landing.sections.architecture },
    { label: "Validasi", href: ROUTES.landing.sections.validation },
    { label: "FAQ", href: ROUTES.landing.sections.faq }
];

export function handleSectionNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    onAfterNavigate?: () => void
): void {
    if (!href.startsWith("#")) return;
    event.preventDefault();
    const target = document.querySelector(href);
    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", href);
    }
    onAfterNavigate?.();
}
