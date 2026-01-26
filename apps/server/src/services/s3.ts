import {
  HeadObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { resolveBucketName } from "./bucket";

const resolveBoolean = (value?: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
};

const buildConfig = (): S3ClientConfig => {
  const isDev = process.env.NODE_ENV !== "production";
  const region = process.env.S3_REGION ?? "us-east-1";
  const endpoint =
    process.env.S3_ENDPOINT ?? (isDev ? "http://127.0.0.1:9000" : undefined);
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID ?? (isDev ? "minioadmin" : undefined);
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY ?? (isDev ? "minioadmin" : undefined);
  const forcePathStyle =
    resolveBoolean(process.env.S3_FORCE_PATH_STYLE) ?? (isDev ? true : undefined);

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

export const headObject = async (key: string): Promise<boolean> => {
  const bucket = resolveBucketName();
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
};
