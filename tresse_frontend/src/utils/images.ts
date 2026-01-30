export const toHttps = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const v = String(url).trim();
  if (!v) return undefined;
  return v.startsWith("http://") ? v.replace("http://", "https://") : v;
};