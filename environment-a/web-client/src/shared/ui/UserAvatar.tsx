type UserAvatarProps = {
    name: string;
    size?: "sm" | "md";
};

export function UserAvatar({ name, size = "md" }: UserAvatarProps): JSX.Element {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U";

    const dimension = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

    return (
        <div className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-brand-ink font-semibold text-white ring-2 ring-brand-amber/25`}>
            {initials}
        </div>
    );
}
