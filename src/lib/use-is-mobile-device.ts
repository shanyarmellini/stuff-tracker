import { useEffect, useState } from "react";

/** True on phones/tablets (mobile UA + coarse pointer); false during SSR. */
export function useIsMobileDevice(): boolean {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const isMobileUserAgent = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    );
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setIsMobileDevice(isMobileUserAgent && isCoarsePointer);
  }, []);

  return isMobileDevice;
}
