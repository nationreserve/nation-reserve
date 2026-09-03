import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ManagedDependency } from "./types.js";

export interface ObjectStorageDependency extends ManagedDependency {
  createUploadUrl(
    bucket: string,
    key: string,
    contentType: string,
    checksumSha256?: string,
  ): Promise<string>;
  createDownloadUrl(bucket: string, key: string): Promise<string>;
}

interface ObjectStorageOptions {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  buckets: readonly string[];
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

  async function bucketExists(bucket: string): Promise<boolean> {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    async connect() {
      for (const bucket of options.buckets) {
        if (await bucketExists(bucket)) continue;
        if (!options.createBucketOnStart) {
          throw new Error(`Object-storage bucket "${bucket}" does not exist.`);
        }
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
      }
    },
    async check() {
      const states = await Promise.all(options.buckets.map(bucketExists));
      return states.every(Boolean) ? "up" : "down";
    },
    createUploadUrl(bucket, key, contentType, checksumSha256) {
      if (!options.buckets.includes(bucket))
        throw new Error("Object-storage bucket is not configured.");
      return getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
          ...(checksumSha256 ? { ChecksumSHA256: checksumSha256 } : {}),
        }),
        { expiresIn: 900 },
      );
    },
    createDownloadUrl(bucket, key) {
      if (!options.buckets.includes(bucket))
        throw new Error("Object-storage bucket is not configured.");
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: 300,
      });
    },
    close() {
      client.destroy();
      return Promise.resolve();
    },
  };
}
