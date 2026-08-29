import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

type QueryParamParser<T> = (rawValue: string | null) => T;
type QueryParamSerializer<T> = (value: T) => string | null;

export type UseQueryParamStateOptions<T> = {
    key: string;
    defaultValue: T;
    parse?: QueryParamParser<T>;
    serialize?: QueryParamSerializer<T>;
    debounceMs?: number;
    replace?: boolean;
};

export type QueryParamState<T> = {
    value: T;
    draftValue: T;
    setValue: (value: T) => void;
    reset: () => void;
};

// React Router's search params setter can receive a stale snapshot when several
// query-param hooks update during the same event. Keep the latest serialized
// snapshot so independent controls can update their own keys without collisions.
let latestSearchParams = "";

export function parseEnumQueryParam<T extends string>(allowedValues: readonly T[], fallback: T): QueryParamParser<T> {
    return (rawValue) => rawValue && allowedValues.includes(rawValue as T) ? rawValue as T : fallback;
}

export function serializeQueryParam(value: string | number | null | undefined): string | null {
    return value === null || value === undefined || value === "" ? null : String(value);
}

export function useQueryParamState<T>({
    key,
    defaultValue,
    parse = (rawValue) => rawValue === null ? defaultValue : rawValue as unknown as T,
    serialize = (value) => String(value),
    debounceMs = 0,
    replace = true
}: UseQueryParamStateOptions<T>): QueryParamState<T> {
    const [searchParams, setSearchParams] = useSearchParams();
    const rawValue = searchParams.get(key);
    const [draftValue, setDraftValue] = useState<T>(() => parse(rawValue));
    const previousRawValue = useRef(rawValue);

    latestSearchParams = searchParams.toString();

    useEffect(() => {
        if (previousRawValue.current === rawValue) {
            return;
        }

        previousRawValue.current = rawValue;
        setDraftValue(parse(rawValue));
    }, [parse, rawValue]);

    const commitValue = useCallback((value: T) => {
        const nextSearchParams = new URLSearchParams(latestSearchParams);
        const serializedValue = serialize(value);

        if (serializedValue === null || serializedValue === "") {
            nextSearchParams.delete(key);
        } else {
            nextSearchParams.set(key, serializedValue);
        }

        latestSearchParams = nextSearchParams.toString();
        setSearchParams(nextSearchParams, { replace });
    }, [key, replace, serialize, setSearchParams]);

    const setValue = useCallback((value: T) => {
        setDraftValue(value);

        if (debounceMs === 0) {
            commitValue(value);
        }
    }, [commitValue, debounceMs]);

    useEffect(() => {
        if (debounceMs === 0) {
            return;
        }

        const timeoutID = window.setTimeout(() => commitValue(draftValue), debounceMs);
        return () => window.clearTimeout(timeoutID);
    }, [commitValue, debounceMs, draftValue]);

    return {
        value: parse(rawValue),
        draftValue,
        setValue,
        reset: () => setValue(defaultValue)
    };
}
