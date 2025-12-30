import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import archiver from "archiver";
import { buildClipFileName } from "../services/ffmpeg";
import { getJob } from "../services/jobs";
import { sanitizeFileName } from "../utils/sanitizeFileName";

const outputRoot = path.resolve(process.cwd(), "..", "..", "output");

const formatTimestamp = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const addFilesFromDirectory = async (
  archive: archiver.Archiver,
  clipsDir: string,
  entryRoot: string
): Promise<number> => {
  const entries = await fs.promises.readdir(clipsDir, { withFileTypes: true });
  let added = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const fileName = entry.name;
    const filePath = path.join(clipsDir, fileName);
    const entryName = path.posix.join(entryRoot, fileName);
    archive.file(filePath, { name: entryName });
    added += 1;
  }

  return added;
};

export const registerBatchDownloadRoute = async (server: FastifyInstance) => {
  server.post("/api/download/batch", async (request, reply) => {
    const body = request.body as { jobIds?: string[] };
    const jobIds = Array.isArray(body?.jobIds)
      ? body.jobIds.filter((id): id is string => typeof id === "string" && id.trim() !== "")
      : [];

    if (jobIds.length === 0) {
      return reply.code(400).send({ error: "jobIds is required" });
    }

    const timestamp = formatTimestamp();
    const rootDir = `ALL_${timestamp}`;

    reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename=\"${rootDir}.zip\"`);

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (error: unknown) => {
      request.log.error(error);
      if (!reply.raw.headersSent) {
        reply.code(500);
      }
      const err = error instanceof Error ? error : new Error(String(error));
      reply.raw.destroy(err);
    });

    const errors: string[] = [];

    for (const jobId of jobIds) {
      const job = getJob(jobId);
      if (!job) {
        errors.push(`${jobId}: job not found`);
        continue;
      }

      if (job.state !== "done") {
        errors.push(`${jobId}: state is ${job.state}`);
        continue;
      }

      const clipsDir = path.join(outputRoot, jobId, "clips");
      try {
        const stat = await fs.promises.stat(clipsDir);
        if (!stat.isDirectory()) {
          errors.push(`${jobId}: clips not found`);
          continue;
        }
      } catch {
        errors.push(`${jobId}: clips not found`);
        continue;
      }

      const safeTitle = job.videoTitle
        ? sanitizeFileName(job.videoTitle)
        : sanitizeFileName(jobId);
      const entryRoot = path.posix.join(rootDir, safeTitle);

      if (job.mode === "all" && job.segments && job.segments.length > 0) {
        let added = 0;
        let missing = 0;
        for (let i = 0; i < job.segments.length; i += 1) {
          const segment = job.segments[i];
          const fileName = buildClipFileName(segment, i);
          const filePath = path.join(clipsDir, fileName);
          try {
            await fs.promises.access(filePath, fs.constants.R_OK);
          } catch {
            missing += 1;
            continue;
          }
          const folder = segment.daw === true ? "dawOnly" : "dawMaybeNotUse";
          const entryName = path.posix.join(entryRoot, folder, fileName);
          archive.file(filePath, { name: entryName });
          added += 1;
        }
        if (added === 0) {
          errors.push(`${jobId}: no clips found`);
        } else if (missing > 0) {
          errors.push(`${jobId}: ${missing} clips missing`);
        }
        continue;
      }

      const added = await addFilesFromDirectory(archive, clipsDir, entryRoot);
      if (added === 0) {
        errors.push(`${jobId}: no clips found`);
      }
    }

    if (errors.length > 0) {
      archive.append(errors.join("\n"), { name: path.posix.join(rootDir, "_errors.txt") });
    }

    void archive.finalize();

    return reply.send(archive);
  });
};
