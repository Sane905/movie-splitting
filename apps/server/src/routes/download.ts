import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import archiver from "archiver";
import { getJob } from "../services/jobs";
import { buildClipFileName } from "../services/ffmpeg";
import { sanitizeFileName } from "../utils/sanitizeFileName";

const outputRoot = path.resolve(process.cwd(), "..", "..", "output");

export const registerDownloadRoute = async (server: FastifyInstance) => {
  server.get("/api/download/:jobId", async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const clipsDir = path.join(outputRoot, jobId, "clips");

    try {
      const stat = await fs.promises.stat(clipsDir);
      if (!stat.isDirectory()) {
        return reply.code(404).send({ error: "clips not found" });
      }
    } catch {
      return reply.code(404).send({ error: "clips not found" });
    }

    const job = getJob(jobId);
    const safeTitle = job?.videoTitle
      ? sanitizeFileName(job.videoTitle)
      : sanitizeFileName(jobId);

    reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="clips_${jobId}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (error: unknown) => {
      request.log.error(error);
      if (!reply.raw.headersSent) {
        reply.code(500);
      }
      const err = error instanceof Error ? error : new Error(String(error));
      reply.raw.destroy(err);
    });

    let addedAny = false;
    if (job?.mode === "all" && job.segments && job.segments.length > 0) {
      for (let i = 0; i < job.segments.length; i += 1) {
        const segment = job.segments[i];
        const fileName = buildClipFileName(segment, i);
        const filePath = path.join(clipsDir, fileName);
        try {
          await fs.promises.access(filePath, fs.constants.R_OK);
        } catch {
          continue;
        }
        const folder = segment.daw === true ? "dawOnly" : "dawMaybeNotUse";
        const entryName = path.posix.join(safeTitle, folder, fileName);
        archive.file(filePath, { name: entryName });
        addedAny = true;
      }
    }

    if (!addedAny) {
      archive.directory(clipsDir, safeTitle);
    }

    void archive.finalize();

    return reply.send(archive);
  });
};
