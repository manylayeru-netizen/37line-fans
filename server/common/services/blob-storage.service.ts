import { put, type PutBlobResult, del } from '@vercel/blob';
import { Logger } from '@nestjs/common';

const logger = new Logger('BlobStorage');

export interface UploadResult {
  url: string;
  pathname: string;
}

export function isBlobStorageAvailable(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function uploadToBlob(
  pathname: string,
  body: Buffer | ReadableStream | string,
  contentType?: string,
): Promise<UploadResult> {
  if (!isBlobStorageAvailable()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured. Vercel Blob is unavailable.');
  }

  const result: PutBlobResult = await put(pathname, body, {
    access: 'public',
    contentType,
  });

  logger.log(`Uploaded to Vercel Blob: ${result.url}`);
  return {
    url: result.url,
    pathname: result.pathname,
  };
}

export async function deleteFromBlob(url: string): Promise<void> {
  if (!isBlobStorageAvailable()) {
    return;
  }

  try {
    await del(url);
    logger.log(`Deleted from Vercel Blob: ${url}`);
  } catch (error) {
    logger.error(`Failed to delete from Vercel Blob: ${url}`, JSON.stringify(error));
  }
}
