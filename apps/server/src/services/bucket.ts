import { HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3";

export const resolveBucketName = (): string => {
  const bucketName = process.env.S3_BUCKET;
  if (bucketName) {
    return bucketName;
  }
  if (process.env.NODE_ENV !== "production") {
    return "video-slicer-local";
  }
  throw new Error("S3_BUCKET is not set");
};

export const ensureBucket = async (): Promise<{ bucket: string }> => {
  const bucketName = resolveBucketName();

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
  }

  return { bucket: bucketName };
};
