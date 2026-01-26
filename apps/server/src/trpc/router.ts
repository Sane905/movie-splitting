import { initTRPC } from "@trpc/server";
import type { Context } from "./context";
import { createJob } from "../services/jobs";

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  createJob: t.procedure.mutation(() => {
    const job = createJob();
    return { jobId: job.id };
  }),
  health: t.procedure.query(() => ({ status: "ok" })),
});

export type AppRouter = typeof appRouter;
