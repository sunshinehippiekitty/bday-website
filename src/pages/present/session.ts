// Shared constants and sessionStorage helpers for the Present experience.

export const FOLK_TRACK =
  import.meta.env.BASE_URL + "folk_acoustic-rain-in-the-forest-130822.mp3";

// Safe read: sessionStorage is unavailable during SSR / some sandboxes.
export const readSession = (key: string): string | null =>
  typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
