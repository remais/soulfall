/** Player-facing presentation settings (not gameplay). Persisted locally. */
export interface Settings {
  screenShake: boolean;
  damageNumbers: boolean;
  lookAhead: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  screenShake: true,
  damageNumbers: true,
  lookAhead: true,
  sound: true,
};

export const CAMERA = {
  /** World pixels visible vertically at zoom 1; zoom adapts to the window. */
  targetViewHeight: 820,
  minZoom: 0.6,
  maxZoom: 1.6,
  followLerp: 0.12,
  lookAheadDistance: 110,
  lookAheadSmoothing: 3,
} as const;

const KEY = 'soulfall.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    // Storage unavailable (private mode etc.) — fall back to defaults.
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}
