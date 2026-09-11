import { useEffect, useRef } from "react";

const DRAG_THRESHOLD = 6;

/**
 * Touch devices get scroll-snap paging for free; this adds click-and-drag
 * paging for mice and swallows the click that ends a drag.
 */
export const useMouseDragPaging = (ref: React.RefObject<HTMLDivElement | null>) => {
  const state = useRef({ pointer: -1, startX: 0, startScrollLeft: 0, dragging: false, suppressClick: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || element.scrollWidth <= element.clientWidth) {
        return;
      }

      state.current = {
        ...state.current,
        pointer: event.pointerId,
        startX: event.clientX,
        startScrollLeft: element.scrollLeft,
        dragging: false,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const current = state.current;
      if (event.pointerId !== current.pointer) {
        return;
      }

      const distance = event.clientX - current.startX;
      if (!current.dragging && Math.abs(distance) < DRAG_THRESHOLD) {
        return;
      }

      if (!current.dragging) {
        current.dragging = true;
        element.classList.add("dragging");
        element.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      element.scrollLeft = current.startScrollLeft - distance;
    };

    const finish = (event: PointerEvent) => {
      const current = state.current;
      if (event.pointerId !== current.pointer) {
        return;
      }

      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      element.classList.remove("dragging");
      current.pointer = -1;

      if (current.dragging) {
        current.dragging = false;
        current.suppressClick = true;
        const page = element.firstElementChild;
        if (page) {
          const pageWidth = page.clientWidth;
          element.scrollTo({ left: Math.round(element.scrollLeft / pageWidth) * pageWidth, behavior: "smooth" });
        }
        window.setTimeout(() => {
          current.suppressClick = false;
        });
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (state.current.suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        state.current.suppressClick = false;
      }
    };

    element.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    element.addEventListener("click", handleClick, { capture: true });
    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      element.removeEventListener("click", handleClick, { capture: true });
    };
  }, [ref]);
};
