import { sanitizeFileName } from "../utils/sanitizeFileName";

export type Segment = {
  start: string;
  end: string;
  title?: string;
  daw?: boolean;
};

export type ParseMode = "all" | "dawOnly";

const dawRegex = /DAW操作\s*[:：]\s*Yes/i;
const dawValueRegex = /DAW操作\s*[:：]\s*(Yes|No|YES|NO|あり|なし|有|無)/i;
const timePattern = String.raw`\d{1,2}:\d{2}(?::\d{2})?`;
const rangeSeparatorPattern = String.raw`[-\u2013\u2014\u2212~\u301c\uFF5E\u30fc\uFF0D]`;
const blockHeaderRegex = new RegExp(
  String.raw`^\s*(?:[■□●◆・*-]|\d+[.)])?\s*[［\[\(（]?\s*(${timePattern})\s*${rangeSeparatorPattern}\s*(${timePattern})\s*[］\]\)）]?`,
  "gm"
);
const contentRegex =
  /内容\s*[:：]\s*([\s\S]*?)(?=(?:種類|DAW操作|見るべき目的|操作内容)\s*[:：]|$)/;

const cleanTitle = (value: string): string | undefined => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return undefined;
  }
  const withoutTrailing = compact.replace(/[,\u3001\uff0c\uff64]+$/g, "").trim();
  return withoutTrailing.length > 0 ? withoutTrailing : undefined;
};

const extractContentTitle = (block: string): string | undefined => {
  const match = contentRegex.exec(block);
  if (!match) {
    return undefined;
  }
  const title = cleanTitle(match[1]);
  return title ? sanitizeFileName(title) : undefined;
};

export const parseIndex = (text: string, mode: ParseMode = "all"): Segment[] => {
  const segments: Segment[] = [];
  const matches = Array.from(text.matchAll(blockHeaderRegex));

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const start = match[1];
    const end = match[2];
    const blockStart = match.index ?? 0;
    const blockEnd = matches[i + 1]?.index ?? text.length;
    const block = text.slice(blockStart, blockEnd);
    const title = extractContentTitle(block) ?? "clip";
    const dawMatch = dawValueRegex.exec(block);
    const daw =
      dawMatch !== null
        ? ["yes", "あり", "有"].includes(dawMatch[1].toLowerCase())
        : dawRegex.test(block) || undefined;

    segments.push({
      start,
      end,
      title,
      daw,
    });
  }

  if (mode === "dawOnly") {
    return segments.filter((segment) => segment.daw === true);
  }

  return segments;
};
