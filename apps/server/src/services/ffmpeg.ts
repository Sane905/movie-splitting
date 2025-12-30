import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Segment } from "./parseIndex";
import { sanitizeFileName } from "../utils/sanitizeFileName";

export type SplitVideoArgs = {
  inputPath: string;
  segments: Segment[];
  outDir: string;
  onProgress?: (completed: number, total: number, segment: Segment) => void;
};

const formatTime = (value: string): string => value.replace(/:/g, "");

const buildFileName = (segment: Segment, index: number, total: number): string => {
  const indexWidth = Math.max(2, String(total).length);
  const prefix = String(index + 1).padStart(indexWidth, "0");
  const range = `${formatTime(segment.start)}-${formatTime(segment.end)}`;
  const titlePart = segment.title ? `_${segment.title}` : "";
  const baseName = `${prefix}_${range}${titlePart}`;
  const safeName = sanitizeFileName(baseName);
  return `${safeName}.mp4`;
};

const runFfmpeg = (args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code}${stderr ? `: ${stderr}` : ""}`));
    });
  });

export const splitVideo = async ({
  inputPath,
  segments,
  outDir,
  onProgress,
}: SplitVideoArgs): Promise<void> => {
  await fs.promises.mkdir(outDir, { recursive: true });

  const total = segments.length;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const fileName = buildFileName(segment, i, total);
    const outputPath = path.join(outDir, fileName);

    await runFfmpeg([
      "-ss",
      segment.start,
      "-to",
      segment.end,
      "-i",
      inputPath,
      "-c",
      "copy",
      outputPath,
    ]);

    if (onProgress) {
      onProgress(i + 1, total, segment);
    }
  }
};
