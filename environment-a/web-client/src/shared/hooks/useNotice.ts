import { useCallback, useRef, useState } from "react";

export type Notice = {
  variant: "success" | "error";
  message: string;
};

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setNotice(null);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback((next: Notice) => {
    setNotice(next);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setNotice(null);
      timerRef.current = null;
    }, 3200);
  }, []);

  return {
    notice,
    show,
    dismiss
  };
}
