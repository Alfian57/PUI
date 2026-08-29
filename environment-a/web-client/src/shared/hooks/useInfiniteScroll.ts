import { useCallback, useEffect, useRef } from "react";

export type UseInfiniteScrollOptions = {
    enabled?: boolean;
    hasMore: boolean;
    isLoading?: boolean;
    onLoadMore: () => void;
    rootMargin?: string;
    threshold?: number;
};

export function useInfiniteScroll({
    enabled = true,
    hasMore,
    isLoading = false,
    onLoadMore,
    rootMargin = "240px 0px",
    threshold = 0
}: UseInfiniteScrollOptions): (node: HTMLElement | null) => void {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const onLoadMoreRef = useRef(onLoadMore);

    useEffect(() => {
        onLoadMoreRef.current = onLoadMore;
    }, [onLoadMore]);

    const sentinelRef = useCallback((node: HTMLElement | null) => {
        observerRef.current?.disconnect();

        if (!node || !enabled || !hasMore || isLoading || typeof IntersectionObserver === "undefined") {
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) {
                onLoadMoreRef.current();
            }
        }, { rootMargin, threshold });

        observer.observe(node);
        observerRef.current = observer;
    }, [enabled, hasMore, isLoading, rootMargin, threshold]);

    useEffect(() => () => observerRef.current?.disconnect(), []);

    return sentinelRef;
}
