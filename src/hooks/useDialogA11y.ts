"use client";

import { useEffect, useRef, RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared across every open dialog so nested dialogs (e.g. Dossier -> Transfer)
// only react to keys when they are the top-most one.
const dialogStack: HTMLElement[] = [];
let scrollLocks = 0;
let originalBodyOverflow = "";

/**
 * Makes a modal behave like a proper dialog:
 *  - moves focus into it on open and restores focus to the trigger on close
 *  - traps Tab / Shift+Tab inside it
 *  - closes on Escape (top-most dialog only)
 *  - locks background scrolling while open
 *
 * Usage: const ref = useDialogA11y<HTMLDivElement>(onClose);
 *        <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} ...>
 */
export function useDialogA11y<T extends HTMLElement>(onClose: () => void): RefObject<T> {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    dialogStack.push(node);
    if (scrollLocks === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLocks += 1;

    const getFocusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Move focus into the dialog (unless something inside already has it, e.g. autoFocus)
    if (!node.contains(document.activeElement)) {
      node.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== node) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === node || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      const idx = dialogStack.indexOf(node);
      if (idx !== -1) dialogStack.splice(idx, 1);

      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) {
        document.body.style.overflow = originalBodyOverflow;
      }

      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return ref;
}
