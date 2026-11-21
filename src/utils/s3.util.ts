import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StatusCodes } from 'http-status-codes';

import { env } from '../config/env-config';
import { ValidationMessages } from '../constants/messages';
import { ApiError } from './api-error.util';

export class S3Service {
  private useS3: boolean;
  private bucketName: string;
  private s3Client: S3Client | null = null;

  constructor() {
    this.useS3 = Boolean(env.USE_S3);
    this.bucketName = env.AWS_S3_BUCKET_NAME || '';

    if (this.useS3) {
      if (!this.bucketName) {
        console.warn('⚠️ USE_S3 is enabled but AWS_S3_BUCKET_NAME is not set.');
      }
      if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
        console.warn('⚠️ AWS credentials are not fully set in environment variables.');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s3Config: any = {
        region: env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
        },
      };

      if (env.AWS_S3_ENDPOINT && env.AWS_S3_ENDPOINT.trim() !== '') {
        s3Config.endpoint = env.AWS_S3_ENDPOINT;
      }

      if (env.AWS_S3_FORCE_PATH_STYLE) {
        s3Config.forcePathStyle = true;
      }

      this.s3Client = new S3Client(s3Config);
    }
  }

  public isEnabled(): boolean {
    return Boolean(this.useS3);
  }

  public getUrl(key: string): string | null {
    if (!key) return null;
    if (env.AWS_S3_ENDPOINT && env.AWS_S3_ENDPOINT.trim() !== '') {
      return `${env.AWS_S3_ENDPOINT}/${this.bucketName}/${key}`;
    }
    return `https://${this.bucketName}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }

  public async uploadFile(fileBuffer: Buffer, key: string, contentType?: string): Promise<string> {
    if (!this.s3Client) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'S3 Client is not initialized');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      return key;
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);

      console.error('❌ S3 upload error:', errMessage);
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `S3 upload failed: ${errMessage}`);
    }
  }

  public async deleteFile(key: string): Promise<void> {
    if (!this.s3Client || !key) return;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);

      console.error('❌ S3 delete error:', errMessage);
    }
  }

  public async deleteMultipleFiles(keys: string[] = []): Promise<void> {
    if (!this.s3Client || !keys.length) return;

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
        },
      });

      await this.s3Client.send(command);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);

      console.error('❌ S3 delete multiple error:', errMessage);
    }
  }

  public async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'S3 Client is not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `S3 signed URL error: ${errMessage}`);
    }
  }

  public async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    if (!this.s3Client) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'S3 Client is not initialized');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `S3 presigned upload URL error: ${errMessage}`,
      );
    }
  }
}

export const s3Helper = new S3Service();
export default s3Helper;
