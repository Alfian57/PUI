import type { LucideIcon } from "lucide-react";

export type IconCard = {
    title: string;
    description: string;
    icon: LucideIcon;
};

export type AudienceCard = {
    label: string;
    icon: LucideIcon;
};

export type LandingActionProps = {
    isAuthenticated: boolean;
    primaryTarget: string;
    primaryLabel: string;
};
