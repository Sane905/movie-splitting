import fs from "node:fs";
import path from "node:path";
import { deleteJob } from "./jobs";

const storageRoot = path.resolve(process.cwd(), "..", "..", "storage");
const outputRoot = path.resolve(process.cwd(), "..", "..", "output");

export const cleanupJob = async (jobId: string): Promise<void> => {
  try {
    await fs.promises.rm(path.join(storageRoot, jobId), {
      recursive: true,
      force: true,
    });
    await fs.promises.rm(path.join(outputRoot, jobId), {
      recursive: true,
      force: true,
    });
    deleteJob(jobId);
  } catch (error) {
    console.error("cleanup failed", { jobId, error });
  }
};
