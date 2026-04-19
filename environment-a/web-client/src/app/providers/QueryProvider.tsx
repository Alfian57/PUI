import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/app/providers/queryClient";

export function QueryProvider({ children }: PropsWithChildren): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
