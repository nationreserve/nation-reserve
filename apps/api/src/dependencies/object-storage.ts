import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ManagedDependency } from "./types.js";

export interface ObjectStorageDependency extends ManagedDependency {
  createUploadUrl(key: string, contentType: string, checksumSha256?: string): Promise<string>;
  createDownloadUrl(key: string): Promise<string>;
}

interface ObjectStorageOptions {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  createBucketOnStart: boolean;
}

export function createObjectStorageDependency(
  options: ObjectStorageOptions,
): ObjectStorageDependency {
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: options.accessKey,
      secretAccessKey: options.secretKey,
    },
  });

  async function bucketExists(): Promise<boolean> {
    try {
      await client.send(new HeadBucketCommand({ Bucket: options.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    async connect() {
      if (await bucketExists()) {
        return;
      }
      if (!options.createBucketOnStart) {
        throw new Error(`Object-storage bucket "${options.bucket}" does not exist.`);
      }
      await client.send(new CreateBucketCommand({ Bucket: options.bucket }));
    },
    async check() {
      return (await bucketExists()) ? "up" : "down";
    },
    createUploadUrl(key, contentType, checksumSha256) {
      return getSignedUrl(client, new PutObjectCommand({ Bucket: options.bucket, Key: key, ContentType: contentType, ...(checksumSha256 ? { ChecksumSHA256: checksumSha256 } : {}) }), { expiresIn: 900 });
    },
    createDownloadUrl(key) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: options.bucket, Key: key }), { expiresIn: 300 });
    },
    close() {
      client.destroy();
      return Promise.resolve();
    },
  };
}


