import { useEffect } from "react";
export default function useKeyboard(map) {
  useEffect(() => {
    const onKey = (e) => {
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map]);
}
