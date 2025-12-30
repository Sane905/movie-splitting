const forbiddenChars = /[\\/:*?"<>|]/g;

export const sanitizeFileName = (input: string, maxLength = 120): string => {
  const normalized = input
    .replace(forbiddenChars, "_")
    .replace(/\s+/g, " ")
    .trim();

  const safe = normalized.length > 0 ? normalized : "untitled";
  return safe.length > maxLength ? safe.slice(0, maxLength).trim() : safe;
};
