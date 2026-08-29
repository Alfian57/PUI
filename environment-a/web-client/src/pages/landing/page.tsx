import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { ArchitectureSection } from "@/pages/landing/_components/ArchitectureSection";
import { AudienceSection } from "@/pages/landing/_components/AudienceSection";
import { FaqSection } from "@/pages/landing/_components/FaqSection";
import { FeaturesSection } from "@/pages/landing/_components/FeaturesSection";
import { HeroSection } from "@/pages/landing/_components/HeroSection";
import { LandingCta } from "@/pages/landing/_components/LandingCta";
import { LandingFooter } from "@/pages/landing/_components/LandingFooter";
import { ProblemSection } from "@/pages/landing/_components/ProblemSection";
import { ProofPointsSection } from "@/pages/landing/_components/ProofPointsSection";
import { ScopeSection } from "@/pages/landing/_components/ScopeSection";
import { SolutionSection } from "@/pages/landing/_components/SolutionSection";
import { ValidationSection } from "@/pages/landing/_components/ValidationSection";
import { ROUTES } from "@/app/routes";

export function LandingPage(): JSX.Element {
    const auth = useAuth();
    const dashboardPath = auth.user?.role === "admin" ? ROUTES.app.analytics.root : ROUTES.app.files;
    const primaryTarget = auth.user ? dashboardPath : ROUTES.auth.register;
    const primaryLabel = auth.user ? "Buka dashboard" : "Daftar sekarang";
    const landingActionProps = {
        isAuthenticated: Boolean(auth.user),
        primaryTarget,
        primaryLabel
    };

    return (
        <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-brand-ink">
            <HeroSection {...landingActionProps} />
            <ProofPointsSection />
            <ProblemSection />
            <SolutionSection />
            <FeaturesSection />
            <ArchitectureSection />
            <ValidationSection />
            <ScopeSection />
            <AudienceSection />
            <FaqSection />
            <LandingCta {...landingActionProps} />
            <LandingFooter {...landingActionProps} />
        </main>
    );
}
