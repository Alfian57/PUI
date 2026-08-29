import type { LucideIcon } from "lucide-react";
import { FileArchive, FileAudio, FileCode2, FileImage, FileText, FileVideo } from "lucide-react";
import type { FileRecord } from "@/shared/types/files";
import type { PreviewKind } from "../_types/filePreview";

export function getPreviewKind(file: FileRecord | null): PreviewKind {
    if (!file) return "unsupported";

    const mime = file.mime_type.toLowerCase();
    const name = file.name.toLowerCase();

    if (mime.startsWith("image/")) return "image";
    if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (
        mime.startsWith("text/")
        || mime.includes("json")
        || mime.includes("xml")
        || mime.includes("csv")
        || [".txt", ".md", ".json", ".csv", ".xml", ".log", ".yml", ".yaml"].some((extension) => name.endsWith(extension))
    ) {
        return "text";
    }

    return "unsupported";
}

export function getPreviewIcon(file: FileRecord): LucideIcon {
    switch (getPreviewKind(file)) {
        case "image":
            return FileImage;
        case "video":
            return FileVideo;
        case "audio":
            return FileAudio;
        case "text":
            return FileCode2;
        case "pdf":
            return FileText;
        default:
            return FileArchive;
    }
}
