import type { ReactNode } from "react";

type ProfileFieldProps = {
    label: string;
    children: ReactNode;
};

export function ProfileField({ label, children }: ProfileFieldProps): JSX.Element {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-logoBlue">{label}</span>
            {children}
        </label>
    );
}
