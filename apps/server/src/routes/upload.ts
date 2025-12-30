import { pipeline } from "node:stream/promises";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { splitVideo } from "../services/ffmpeg";
import { createJob, updateJob } from "../services/jobs";
import { parseIndex, type ParseMode } from "../services/parseIndex";

const storageRoot = path.resolve(process.cwd(), "..", "..", "storage");
const outputRoot = path.resolve(process.cwd(), "..", "..", "output");

export const registerUploadRoute = async (server: FastifyInstance) => {
  server.post("/api/upload", async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.code(400).send({ error: "expected multipart/form-data" });
    }

    const job = createJob();
    const jobDir = path.join(storageRoot, job.jobId);
    await fs.promises.mkdir(jobDir, { recursive: true });

    const videoPath = path.join(jobDir, "original.mp4");
    const indexTextPath = path.join(jobDir, "index.txt");
    let indexText = "";
    let mode: ParseMode = "all";
    let savedVideo = false;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        if (part.fieldname !== "video") {
          part.file.resume();
          continue;
        }
        if (savedVideo) {
          part.file.resume();
          continue;
        }
        await pipeline(part.file, fs.createWriteStream(videoPath));
        savedVideo = true;
        continue;
      }

      if (part.fieldname === "indexText") {
        indexText = typeof part.value === "string" ? part.value : String(part.value);
        continue;
      }

      if (part.fieldname === "mode") {
        const value = typeof part.value === "string" ? part.value : String(part.value);
        if (value === "dawOnly") {
        mode = "dawOnly";
        }
      }
    }

    if (!savedVideo) {
      updateJob(job.jobId, { state: "error", error: "missing video file" });
      return reply.code(400).send({ error: "video file is required" });
    }

    if (!indexText.trim()) {
      updateJob(job.jobId, { state: "error", error: "missing indexText" });
      return reply.code(400).send({ error: "indexText is required" });
    }

    await fs.promises.writeFile(indexTextPath, indexText, "utf8");
    const segments = parseIndex(indexText, mode);

    if (process.env.NODE_ENV !== "production" && segments[0]) {
      request.log.info({ segment: segments[0] }, "parsed first segment");
    }

    updateJob(job.jobId, {
      segments,
      mode,
      videoPath,
      indexTextPath,
    });

    const outDir = path.join(outputRoot, job.jobId, "clips");

    void (async () => {
      updateJob(job.jobId, { state: "processing", progress: 0 });
      try {
        if (segments.length === 0) {
          updateJob(job.jobId, { state: "done", progress: 100, message: "no segments" });
          return;
        }

        await splitVideo({
          inputPath: videoPath,
          segments,
          outDir,
          onProgress: (completed, total) => {
            const progress = Math.round((completed / total) * 100);
            updateJob(job.jobId, { progress });
          },
        });

        updateJob(job.jobId, { state: "done", progress: 100 });
      } catch (error) {
        updateJob(job.jobId, {
          state: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return reply.send({ jobId: job.jobId });
  });
};
