import { HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3";

const resolveBucketName = (): string => {
  const bucketName = process.env.S3_BUCKET;
  if (!bucketName) {
    throw new Error("S3_BUCKET is not set");
  }
  return bucketName;
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
