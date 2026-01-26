import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3";

const resolveBucketName = (): string => {
  const bucketName = process.env.S3_BUCKET;
  if (!bucketName) {
    throw new Error("S3_BUCKET is not set");
  }
  return bucketName;
};

type PresignPutArgs = {
  key: string;
  expiresIn?: number;
  contentType?: string;
};

type PresignGetArgs = {
  key: string;
  expiresIn?: number;
};

export const presignPutUrl = async ({
  key,
  expiresIn = 300,
  contentType,
}: PresignPutArgs): Promise<string> => {
  const bucketName = resolveBucketName();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

export const presignGetUrl = async ({
  key,
  expiresIn = 300,
}: PresignGetArgs): Promise<string> => {
  const bucketName = resolveBucketName();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};
