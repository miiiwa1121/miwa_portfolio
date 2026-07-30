"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A single transient message. The timer is owned by a ref and cleared on
 * unmount, so a message raised just before the detail page closes cannot
 * fire into a component that is no longer there.
 */
export function useToast(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const show = useCallback(
    (text: string) => {
      clear();
      setMessage(text);
      timer.current = setTimeout(() => {
        setMessage(null);
        timer.current = null;
      }, durationMs);
    },
    [clear, durationMs]
  );

  useEffect(() => clear, [clear]);

  return { message, show };
}
