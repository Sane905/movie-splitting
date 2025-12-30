import type { FastifyInstance } from "fastify";
import { getJob } from "../services/jobs";

export const registerStatusRoute = async (server: FastifyInstance) => {
  server.get("/api/status/:jobId", async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = getJob(jobId);

    if (!job) {
      return reply.code(404).send({ error: "job not found" });
    }

    return reply.send({
      state: job.state,
      progress: job.progress,
      message: job.message,
      error: job.error,
    });
  });
};
