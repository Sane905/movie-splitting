export type Segment = {
  start: string;
  end: string;
  title?: string;
  daw?: boolean;
};

export type ParseMode = "all" | "dawOnly";

const dawRegex = /DAW操作\s*[:：]\s*Yes/i;

const extractTitle = (line: string, matchedRange: string): string | undefined => {
  const cleaned = line
    .replace(matchedRange, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[■◆●•]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : undefined;
};

const hasTimeRange = (line: string): boolean =>
  /(\d{2}:\d{2}:\d{2})\s*[-\u2013]\s*(\d{2}:\d{2}:\d{2})/.test(line);

export const parseIndex = (text: string, mode: ParseMode = "all"): Segment[] => {
  const lines = text.split(/\r?\n/);
  const segments: Segment[] = [];
  let pendingDaw = false;
  let lastSegmentLineIndex = -1;

  lines.forEach((line, index) => {
    const lineHasTime = hasTimeRange(line);
    const lineHasDaw = dawRegex.test(line);

    if (lineHasTime) {
      const timeRegex =
        /(\d{2}:\d{2}:\d{2})\s*[-\u2013]\s*(\d{2}:\d{2}:\d{2})/g;
      const lineDaw = lineHasDaw || pendingDaw;
      let match: RegExpExecArray | null;

      pendingDaw = false;
      lastSegmentLineIndex = index;

      while ((match = timeRegex.exec(line)) !== null) {
        const start = match[1];
        const end = match[2];
        const title = extractTitle(line, match[0]);

        segments.push({
          start,
          end,
          title,
          daw: lineDaw || undefined,
        });
      }
      return;
    }

    if (lineHasDaw) {
      if (lastSegmentLineIndex === index - 1 && segments.length > 0) {
        segments[segments.length - 1].daw = true;
        return;
      }

      if (lines[index + 1] && hasTimeRange(lines[index + 1])) {
        pendingDaw = true;
      }
    }
  });

  if (mode === "dawOnly") {
    return segments.filter((segment) => segment.daw === true);
  }

  return segments;
};
