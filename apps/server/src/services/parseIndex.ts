export type Segment = {
  start: string;
  end: string;
  title?: string;
  daw?: boolean;
};

export type ParseMode = "all" | "dawOnly";

const dawRegex = /DAW操作\s*[:：]\s*Yes/i;
const blockHeaderRegex =
  /■\s*\[(\d{2}:\d{2}:\d{2})\s*[-\u2013]\s*(\d{2}:\d{2}:\d{2})\]/g;
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
  return cleanTitle(match[1]);
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
    const daw = dawRegex.test(block) || undefined;

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
