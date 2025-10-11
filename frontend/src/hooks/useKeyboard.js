import { useEffect } from "react";

export default function useKeyboard(bindings, opts = {}) {
  const { enabled = true, ignoreEditable = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if (ignoreEditable) {
        const el = e.target;
        const isEditable =
          el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "SELECT" ||
            el.isContentEditable);
        if (isEditable) return;
      }
      const fn = bindings[e.key];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings, enabled, ignoreEditable]);
}
