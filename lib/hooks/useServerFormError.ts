"use client";

import { useEffect, useRef, useState } from "react";

export type ServerFormError = { message: string; field?: string };

// Generic scroll-to/focus/flag helper for a useActionState-driven form: when
// the server comes back with an error, an applicant scrolled well below the
// form (which is where a real submit click leaves them) previously had no
// way to know anything failed, since a single banner rendered at the very
// top with no scroll or focus change. This scrolls to and focuses either the
// specific field the error is about (via a `data-field="<key>"` attribute
// the caller puts on that field's wrapper) or the banner itself when the
// error isn't tied to one field.
//
// Not wired to any one form's shape on purpose -- `getError` adapts whatever
// action-state type a caller has into `{message, field?}`, so this is meant
// to be reused by any other server-action form in this codebase, not just
// the public application form it was built for.
export function useServerFormError<S>(
  state: S,
  getError: (state: S) => ServerFormError | null
) {
  const bannerRef = useRef<HTMLElement | null>(null);
  const [erroredField, setErroredField] = useState<string | null>(null);

  useEffect(() => {
    const err = getError(state);
    if (!err) return;
    setErroredField(err.field ?? null);

    const target = err.field
      ? (document.querySelector(`[data-field="${err.field}"]`) as HTMLElement | null)
      : bannerRef.current;
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = target.matches("input, textarea, select, button")
      ? target
      : (target.querySelector<HTMLElement>("input, textarea, [role='radio'], button") ?? target);
    // Delayed so focus lands after the smooth scroll settles, rather than
    // fighting it -- an immediate focus() can yank the viewport before the
    // scroll animation finishes.
    const timeout = setTimeout(() => focusable.focus(), 350);
    return () => clearTimeout(timeout);
    // Only the identity of `state` should re-trigger this -- `getError` is
    // expected to be a fresh inline closure on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Called from a field's own onChange -- once the applicant starts
  // correcting the flagged field, the flag should clear immediately rather
  // than waiting for the next full server round trip.
  function clearFieldError(field: string) {
    setErroredField((prev) => (prev === field ? null : prev));
  }

  function fieldErrorProps(field: string) {
    return {
      "data-field": field,
      "aria-invalid": erroredField === field ? ("true" as const) : undefined,
    };
  }

  return { bannerRef, erroredField, clearFieldError, fieldErrorProps };
}
