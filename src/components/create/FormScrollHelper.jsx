import { useEffect, useRef } from "react";

export default function FormScrollHelper({ containerRef }) {
  const paddingTimer = useRef(null);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const handleFocus = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        // Delay to let mobile keyboard open
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);

        // Add bottom padding for mobile keyboard
        container.style.paddingBottom = "300px";
        clearTimeout(paddingTimer.current);
      }
    };

    const handleBlur = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        paddingTimer.current = setTimeout(() => {
          container.style.paddingBottom = "";
        }, 200);
      }
    };

    container.addEventListener("focusin", handleFocus);
    container.addEventListener("focusout", handleBlur);

    return () => {
      container.removeEventListener("focusin", handleFocus);
      container.removeEventListener("focusout", handleBlur);
      clearTimeout(paddingTimer.current);
    };
  }, [containerRef]);

  return null;
}