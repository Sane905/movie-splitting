import type { Segment } from "./parseIndex";

export type JobState = "queued" | "processing" | "done" | "error";

export type Job = {
  jobId: string;
  state: JobState;
  progress: number;
  segments?: Segment[];
  videoPath?: string;
  videoTitle?: string;
  indexTextPath?: string;
  message?: string;
  error?: string;
  createdAt: number;
};

const jobs = new Map<string, Job>();

const createJobId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createJob = (): Job => {
  const jobId = createJobId();
  const job: Job = {
    jobId,
    state: "queued",
    progress: 0,
    createdAt: Date.now(),
  };

  jobs.set(jobId, job);
  return job;
};

export const getJob = (jobId: string): Job | undefined => jobs.get(jobId);

export const updateJob = (jobId: string, update: Partial<Job>): Job | undefined => {
  const job = jobs.get(jobId);
  if (!job) {
    return undefined;
  }

  const next: Job = {
    ...job,
    ...update,
  };

  jobs.set(jobId, next);
  return next;
};
