import { useSyncExternalStore } from "react";

export function useMediaQuery(query) {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches
  );
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}
