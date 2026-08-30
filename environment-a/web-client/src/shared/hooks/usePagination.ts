import { useCallback } from "react";
import { serializeQueryParam, useQueryParamState } from "@/shared/hooks/useQueryParamState";

export type UsePaginationOptions = {
    queryParam: string;
    pageSize: number;
    defaultPage?: number;
};

export type PaginationState = {
    page: number;
    offset: number;
    pageSize: number;
    hasPrevious: boolean;
    hasNext: (total?: number) => boolean;
    setPage: (page: number) => void;
    nextPage: () => void;
    previousPage: () => void;
    reset: () => void;
};

function parsePageQueryParam(rawValue: string | null, fallback: number): number {
    if (rawValue === null || rawValue.trim() === "") {
        return fallback;
    }

    const page = Number(rawValue);
    return Number.isInteger(page) && page >= 0 ? page : fallback;
}

export function usePagination({ queryParam, pageSize, defaultPage = 0 }: UsePaginationOptions): PaginationState {
    const { value: page, setValue, reset } = useQueryParamState<number>({
        key: queryParam,
        defaultValue: defaultPage,
        parse: (rawValue) => parsePageQueryParam(rawValue, defaultPage),
        serialize: serializeQueryParam
    });

    const setPage = useCallback((nextPage: number) => {
        const normalizedPage = Number.isFinite(nextPage) ? Math.max(0, Math.trunc(nextPage)) : 0;
        setValue(normalizedPage);
    }, [setValue]);

    const nextPage = useCallback(() => {
        setPage(page + 1);
    }, [page, setPage]);

    const previousPage = useCallback(() => {
        setPage(page - 1);
    }, [page, setPage]);

    const hasNext = useCallback((total?: number) => {
        if (total === undefined) {
            return true;
        }

        return (page + 1) * pageSize < total;
    }, [page, pageSize]);

    return {
        page,
        offset: page * pageSize,
        pageSize,
        hasPrevious: page > 0,
        hasNext,
        setPage,
        nextPage,
        previousPage,
        reset
    };
}
