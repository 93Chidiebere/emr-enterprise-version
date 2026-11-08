"use client";

import { useEffect } from "react";

const CONTROL = "input:not([type='hidden']), select, textarea";
let counter = 0;

function enhance() {
  // 1) Programmatically associate orphan <label> elements with the control that follows them.
  document.querySelectorAll<HTMLLabelElement>("label:not([for])").forEach((label) => {
    if (label.querySelector(CONTROL)) return; // already wraps its control

    let control: HTMLElement | null = null;
    let sibling = label.nextElementSibling;
    while (sibling && !control) {
      if (sibling.tagName === "LABEL") break; // reached the next field
      control = sibling.matches(CONTROL)
        ? (sibling as HTMLElement)
        : sibling.querySelector<HTMLElement>(CONTROL);
      sibling = sibling.nextElementSibling;
    }

    if (control) {
      if (!control.id) {
        counter += 1;
        control.id = `auto-field-${counter}`;
      }
      label.htmlFor = control.id;
    }
  });

  // 2) Any control that still has no accessible name falls back to its placeholder/title.
  document.querySelectorAll<HTMLElement>(CONTROL).forEach((el) => {
    if (el.closest("label")) return;
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return;
    if (el.id && document.querySelector(`label[for="${el.id}"]`)) return;

    const fallback = el.getAttribute("placeholder") || el.getAttribute("title");
    if (fallback) el.setAttribute("aria-label", fallback);
  });
}

/**
 * Stop-gap: the existing forms use <label> + <input> siblings without htmlFor/id,
 * so screen readers cannot tell which label belongs to which field. This links them
 * at runtime. The long-term fix is adding htmlFor/id pairs directly in each form.
 */
export function FormA11yEnhancer() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(enhance);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
