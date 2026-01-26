import { TRPCError, initTRPC } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context";
import { createJob } from "../services/jobs";
import { getJob, updateJobAssets } from "../services/jobs";
import { ensureBucket } from "../services/bucket";
import { presignPutUrl } from "../services/presign";

const t = initTRPC.context<Context>().create();

const uploadUrlInput = z.object({
  jobId: z.string().min(1),
  contentType: z.string().min(1).optional(),
});

const statusInput = z.object({
  jobId: z.string().min(1),
});

const buildUploadKey = (jobId: string): string => `jobs/${jobId}/original.mp4`;

export const appRouter = t.router({
  createJob: t.procedure.mutation(() => {
    const job = createJob();
    return { jobId: job.id };
  }),
  getUploadUrl: t.procedure.input(uploadUrlInput).mutation(async ({ input }) => {
    const job = getJob(input.jobId);
    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "job not found" });
    }

    await ensureBucket();
    const key = buildUploadKey(input.jobId);
    const url = await presignPutUrl({ key, contentType: input.contentType });
    updateJobAssets(input.jobId, { videoKey: key });

    return { jobId: input.jobId, key, url };
  }),
  getStatus: t.procedure.input(statusInput).query(({ input }) => {
    const job = getJob(input.jobId);
    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "job not found" });
    }

    return {
      state: job.state,
      progress: job.progress,
      message: job.message,
      error: job.error,
    };
  }),
  health: t.procedure.query(() => ({ status: "ok" })),
});

export type AppRouter = typeof appRouter;
