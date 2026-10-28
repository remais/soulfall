import en from './en.json';

type Strings = Record<string, string>;
const tables: Record<string, Strings> = { en };
let current: Strings = en;

export function setLocale(locale: string): void {
  current = tables[locale] ?? en;
}

/** Looks up a UI string and fills `{name}` placeholders. Missing keys render as the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = current[key] ?? en[key as keyof typeof en] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
