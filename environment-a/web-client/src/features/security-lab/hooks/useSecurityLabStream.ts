import { useCallback, useRef, useState } from "react";
import { env } from "@/shared/config/env";
import { tokenStorage } from "@/shared/lib/tokenStorage";
import type { SecurityLabEvent, SecurityLabSummary } from "@/features/security-lab/types";

export type SecurityLabRunState = "idle" | "running" | "done" | "error";

type ParsedFrame = {
  event: string;
  data: string;
};

/**
 * Parses a chunk of SSE text into complete frames. SSE frames are separated by a
 * blank line; each frame has an "event:" line and a "data:" line. Returns the
 * frames found and any leftover (incomplete) buffer to carry over.
 */
function parseSSE(buffer: string): { frames: ParsedFrame[]; rest: string } {
  const frames: ParsedFrame[] = [];
  const segments = buffer.split("\n\n");
  // The last segment may be incomplete; keep it as leftover.
  const rest = segments.pop() ?? "";

  for (const segment of segments) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of segment.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trim());
      }
    }
    if (dataLines.length > 0) {
      frames.push({ event, data: dataLines.join("\n") });
    }
  }

  return { frames, rest };
}

/**
 * useSecurityLabStream connects to the api-service Security Lab SSE endpoint and
 * surfaces each phase event live. It uses fetch streaming (not EventSource)
 * because the endpoint requires a Bearer token, which EventSource cannot send.
 */
export function useSecurityLabStream() {
  const [events, setEvents] = useState<SecurityLabEvent[]>([]);
  const [summary, setSummary] = useState<SecurityLabSummary | null>(null);
  const [state, setState] = useState<SecurityLabRunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setSummary(null);
    setError(null);
    setState("idle");
  }, []);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEvents([]);
    setSummary(null);
    setError(null);
    setState("running");

    const token = tokenStorage.get();

    try {
      const response = await fetch(`${env.apiBaseUrl}/api/v1/security-lab/run`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream"
        },
        signal: controller.signal
      });

      if (response.status === 404) {
        throw new Error("Security Lab tidak aktif di server (SECURITY_LAB_ENABLED=false).");
      }
      if (!response.ok) {
        throw new Error(`Server menolak permintaan (HTTP ${response.status}).`);
      }
      if (!response.body) {
        throw new Error("Streaming tidak didukung oleh browser ini.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const { frames, rest } = parseSSE(buffer);
        buffer = rest;

        for (const frame of frames) {
          if (frame.event === "phase") {
            try {
              const parsed = JSON.parse(frame.data) as SecurityLabEvent;
              setEvents((prev) => [...prev, parsed]);
            } catch {
              /* ignore malformed frame */
            }
          } else if (frame.event === "summary") {
            try {
              setSummary(JSON.parse(frame.data) as SecurityLabSummary);
            } catch {
              /* ignore */
            }
          } else if (frame.event === "done") {
            setState("done");
          } else if (frame.event === "error") {
            let message = "Skenario melaporkan kesalahan.";
            try {
              const parsed = JSON.parse(frame.data) as { error?: string };
              if (parsed.error) {
                message = parsed.error;
              }
            } catch {
              /* keep default */
            }
            setError(message);
            setState("error");
          }
        }
      }

      setState((prev) => (prev === "error" ? prev : "done"));
    } catch (cause) {
      if (controller.signal.aborted) {
        return;
      }
      setError(cause instanceof Error ? cause.message : "Gagal menjalankan simulasi.");
      setState("error");
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => (prev === "running" ? "idle" : prev));
  }, []);

  return { events, summary, state, error, run, cancel, reset };
}
