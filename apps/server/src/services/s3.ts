import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";

const resolveBoolean = (value?: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
};

const buildConfig = (): S3ClientConfig => {
  const region = process.env.S3_REGION ?? "us-east-1";
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const forcePathStyle = resolveBoolean(process.env.S3_FORCE_PATH_STYLE);

  const config: S3ClientConfig = {
    region,
    endpoint,
    forcePathStyle,
  };

  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  }

  return config;
};

export const createS3Client = (): S3Client => new S3Client(buildConfig());

export const s3Client = createS3Client();
