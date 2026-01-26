import cors from "@fastify/cors";
import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

const server = Fastify({ logger: true });
const port = Number(process.env.PORT) || 8787;
const host = "127.0.0.1";

const start = async () => {
  if (process.env.NODE_ENV !== "production") {
    await server.register(cors, {
      origin: "http://localhost:5173",
    });
  }

  server.get("/api/health", async () => "ok");
  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext },
  });

  try {
    await server.listen({ port, host });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
