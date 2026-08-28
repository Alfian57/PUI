import { useEffect, useState } from "react";
import { env } from "@/shared/config/env";
import { tokenStorage } from "@/shared/lib/tokenStorage";
import { parseSSE } from "@/shared/lib/sse";
import type { SecurityEvent } from "@/shared/types/domain";

export type SecurityMonitorConnection = "disabled" | "connecting" | "live" | "reconnecting" | "error";

export function useSecurityMonitorStream(enabled: boolean) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [connection, setConnection] = useState<SecurityMonitorConnection>(enabled ? "connecting" : "disabled");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnection("disabled");
      return;
    }

    let disposed = false;
    let retryTimer: number | undefined;
    let controller: AbortController | null = null;

    const scheduleReconnect = (): void => {
      if (disposed) return;
      setConnection("reconnecting");
      retryTimer = window.setTimeout(() => void connect(), 2000);
    };

    const connect = async (): Promise<void> => {
      controller?.abort();
      controller = new AbortController();
      setConnection((current) => current === "live" ? "reconnecting" : "connecting");
      const token = tokenStorage.get();

      try {
        const response = await fetch(`${env.apiBaseUrl}/api/v1/admin/security-monitor/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Akses monitoring ditolak (HTTP ${response.status}).`);
          }
          throw new Error(`Stream monitoring gagal (HTTP ${response.status}).`);
        }
        if (!response.body) throw new Error("Streaming tidak didukung oleh browser ini.");

        setError(null);
        setConnection("live");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!disposed) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSSE(buffer);
          buffer = parsed.rest;
          for (const frame of parsed.frames) {
            if (frame.event !== "security_event") continue;
            try {
              const event = JSON.parse(frame.data) as SecurityEvent;
              setEvents((previous) => [event, ...previous.filter((item) => item.id !== event.id)].slice(0, 100));
            } catch {
              // Ignore malformed frames and keep the live stream open.
            }
          }
        }
        if (!disposed) scheduleReconnect();
      } catch (cause) {
        if (disposed || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Stream monitoring gagal.");
        if (cause instanceof Error && cause.message.startsWith("Akses monitoring")) {
          setConnection("error");
          return;
        }
        scheduleReconnect();
      }
    };

    setEvents([]);
    void connect();
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      controller?.abort();
    };
  }, [enabled]);

  return { events, connection, error };
}
