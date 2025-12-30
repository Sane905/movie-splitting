import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import archiver from "archiver";
import { getJob } from "../services/jobs";
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

    archive.directory(clipsDir, safeTitle);
    void archive.finalize();

    return reply.send(archive);
  });
};
