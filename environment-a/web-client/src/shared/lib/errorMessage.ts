import axios from "axios";

export function toErrorMessage(cause: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: string }>(cause)) {
    return cause.response?.data?.error ?? cause.message;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  return fallback;
}
