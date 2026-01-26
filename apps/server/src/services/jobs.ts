import type { Segment } from "./parseIndex";

export type JobState = "queued" | "processing" | "done" | "error";

export type Job = {
  id: string;
  state: JobState;
  progress: number;
  segments: Segment[];
  message?: string;
  error?: string;
  createdAt: number;
};

export type JobAssets = {
  videoPath?: string;
  videoTitle?: string;
  indexTextPath?: string;
  videoKey?: string;
};

const jobs = new Map<string, Job>();
const jobAssets = new Map<string, JobAssets>();

const createJobId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createJob = (): Job => {
  const jobId = createJobId();
  const job: Job = {
    id: jobId,
    state: "queued",
    progress: 0,
    segments: [],
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

export const getJobAssets = (jobId: string): JobAssets | undefined => jobAssets.get(jobId);

export const updateJobAssets = (
  jobId: string,
  update: Partial<JobAssets>
): JobAssets | undefined => {
  const current = jobAssets.get(jobId) ?? {};
  const next: JobAssets = {
    ...current,
    ...update,
  };
  jobAssets.set(jobId, next);
  return next;
};

export const deleteJob = (jobId: string): void => {
  jobs.delete(jobId);
  jobAssets.delete(jobId);
};
