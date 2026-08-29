import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFileBlob } from "@/pages/dashboard/_api/fileApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { FileRecord } from "@/shared/types/files";
import type { FileModalTab } from "../_types/filePreview";
import { getPreviewKind } from "../_lib/filePreview";

const TEXT_PREVIEW_LIMIT = 2 * 1024 * 1024;

type UseFilePreviewOptions = {
    open: boolean;
    tab: FileModalTab;
    file: FileRecord | null;
};

export function useFilePreview({ open, tab, file }: UseFilePreviewOptions) {
    const [objectURL, setObjectURL] = useState<string | null>(null);
    const [textPreview, setTextPreview] = useState<string | null>(null);
    const [textError, setTextError] = useState<string | null>(null);
    const previewKind = getPreviewKind(file);
    const shouldFetchBlob = open && tab === "preview" && Boolean(file) && previewKind !== "unsupported";
    const blobQuery = useQuery({
        queryKey: queryKeys.files.preview(file?.id ?? "none"),
        queryFn: () => fetchFileBlob(file!.id),
        enabled: shouldFetchBlob,
        staleTime: 0
    });

    useEffect(() => {
        if (!blobQuery.data || !shouldFetchBlob) {
            setObjectURL(null);
            setTextPreview(null);
            setTextError(null);
            return;
        }

        if (previewKind === "text") {
            setObjectURL(null);
            if (blobQuery.data.size > TEXT_PREVIEW_LIMIT) {
                setTextPreview(null);
                setTextError("Berkas teks terlalu besar untuk ditampilkan langsung.");
                return;
            }

            let cancelled = false;
            void blobQuery.data.text().then((content) => {
                if (!cancelled) {
                    setTextPreview(content);
                    setTextError(null);
                }
            }).catch(() => {
                if (!cancelled) {
                    setTextPreview(null);
                    setTextError("Preview teks tidak dapat dibuka.");
                }
            });

            return () => {
                cancelled = true;
            };
        }

        const url = URL.createObjectURL(blobQuery.data);
        setObjectURL(url);
        setTextPreview(null);
        setTextError(null);

        return () => URL.revokeObjectURL(url);
    }, [blobQuery.data, previewKind, shouldFetchBlob]);

    useEffect(() => {
        if (!open) {
            setObjectURL(null);
            setTextPreview(null);
            setTextError(null);
        }
    }, [open]);

    return {
        blobQuery,
        objectURL,
        previewKind,
        shouldFetchBlob,
        textPreview,
        textError
    };
}
