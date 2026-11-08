/**
 * Brand colours for an institution. Each institution picks a PRIMARY colour (dark backgrounds,
 * headers) and an ACCENT colour (buttons, highlights). From those two we build every shade the
 * interface needs, and we adjust colours that would make text hard to read.
 * Used on the server (to validate/save) and in the browser (to preview).
 */

type RGB = [number, number, number];

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

export function hexToRgb(hex: string): RGB {
  const h = hex.trim().replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  const to = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The primary colour carries white text, so it must be dark enough (contrast with white at least 7:1). */
export function normalizePrimary(hex: string): string {
  let c = hexToRgb(hex);
  for (let i = 0; i < 40 && contrast(c, WHITE) < 7; i++) c = mix(c, BLACK, 0.06);
  return rgbToHex(c);
}

/** The accent sits on dark backgrounds and carries dark text, so it must be bright enough. */
export function normalizeAccent(hex: string): string {
  let c = hexToRgb(hex);
  for (let i = 0; i < 40 && luminance(c) < 0.22; i++) c = mix(c, WHITE, 0.06);
  return rgbToHex(c);
}

export const DEFAULT_PRIMARY = "#0B2545";
export const DEFAULT_ACCENT = "#F59E0B";

const triplet = (c: RGB) => `${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])}`;

/** CSS variables (as "r g b" triplets) that the Tailwind theme reads. */
export function buildThemeVars(primaryHex: string, accentHex: string): Record<string, string> {
  const p = hexToRgb(normalizePrimary(primaryHex));
  const a = hexToRgb(normalizeAccent(accentHex));
  return {
    "--c-navy": triplet(p),
    "--c-navy-dark": triplet(mix(p, BLACK, 0.3)),
    "--c-navy-deep": triplet(mix(p, BLACK, 0.55)),
    "--c-navy-surface": triplet(mix(p, WHITE, 0.07)),
    "--c-navy-surface-hover": triplet(mix(p, WHITE, 0.14)),
    "--c-navy-border": triplet(mix(p, WHITE, 0.2)),
    "--c-navy-light": triplet(mix(p, WHITE, 0.88)),

    "--c-brand": triplet(a),
    "--c-brand-hover": triplet(mix(a, BLACK, 0.16)),
    "--c-brand-dark": triplet(mix(a, BLACK, 0.34)),
    "--c-brand-light": triplet(mix(a, WHITE, 0.82)),
    "--c-brand-border": triplet(mix(a, WHITE, 0.4)),

    // the amber-* utilities used all over the interface follow the accent colour
    "--c-accent-50": triplet(mix(a, WHITE, 0.92)),
    "--c-accent-100": triplet(mix(a, WHITE, 0.82)),
    "--c-accent-200": triplet(mix(a, WHITE, 0.62)),
    "--c-accent-300": triplet(mix(a, WHITE, 0.38)),
    "--c-accent-400": triplet(mix(a, WHITE, 0.18)),
    "--c-accent-500": triplet(a),
    "--c-accent-600": triplet(mix(a, BLACK, 0.16)),
    "--c-accent-700": triplet(mix(a, BLACK, 0.34)),
    "--c-accent-800": triplet(mix(a, BLACK, 0.5)),
    "--c-accent-900": triplet(mix(a, BLACK, 0.62)),
  };
}

export const PRIMARY_PRESETS: Array<{ name: string; hex: string }> = [
  { name: "Navy", hex: "#0B2545" },
  { name: "Forest", hex: "#0F3D2E" },
  { name: "Maroon", hex: "#5B1A2B" },
  { name: "Royal purple", hex: "#2E1A5B" },
  { name: "Teal", hex: "#0B3B46" },
  { name: "Charcoal", hex: "#1F2933" },
];

export const ACCENT_PRESETS: Array<{ name: string; hex: string }> = [
  { name: "Gold", hex: "#F59E0B" },
  { name: "Sky", hex: "#38BDF8" },
  { name: "Mint", hex: "#34D399" },
  { name: "Coral", hex: "#FB7185" },
  { name: "Lilac", hex: "#A78BFA" },
  { name: "Lime", hex: "#A3E635" },
];
