type Props = {
    message: string;
    variant: "success" | "error";
};

export function NoticeBanner({ message, variant }: Props) {
    return <div className={`notice notice--${variant}`}>{message}</div>;
}
