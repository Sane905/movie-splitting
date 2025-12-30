import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { registerBatchDownloadRoute } from "./routes/batchDownload";
import { registerDownloadRoute } from "./routes/download";
import { registerStatusRoute } from "./routes/status";
import { registerUploadRoute } from "./routes/upload";

const server = Fastify({ logger: true });
const port = Number(process.env.PORT) || 8787;
const host = "127.0.0.1";

const start = async () => {
  if (process.env.NODE_ENV !== "production") {
    await server.register(cors, {
      origin: "http://localhost:5173",
    });
  }

  await server.register(multipart, {
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024,
    },
  });

  server.get("/api/health", async () => "ok");
  await registerUploadRoute(server);
  await registerDownloadRoute(server);
  await registerStatusRoute(server);
  await registerBatchDownloadRoute(server);

  try {
    await server.listen({ port, host });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
