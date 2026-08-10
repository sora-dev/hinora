import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export const POLICY_STORAGE_BUCKET = 'policies';
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private client: SupabaseClient | null = null;

  onModuleInit() {
    try {
      this.getClient();
      void this.ensurePoliciesBucket();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown storage init error.';
      this.logger.warn(`Supabase Storage is not configured yet: ${message}`);
    }
  }

  isConfigured() {
    return Boolean(
      process.env.SUPABASE_URL?.trim() &&
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    );
  }

  async uploadPolicyFile(file: Express.Multer.File) {
    const client = this.getClient();
    const objectKey = this.buildObjectKey(file.originalname);
    const buffer = file.buffer;

    if (!buffer || buffer.length === 0) {
      throw new ServiceUnavailableException(
        'Uploaded file buffer is empty. Use memory storage for uploads.',
      );
    }

    const { error } = await client.storage
      .from(POLICY_STORAGE_BUCKET)
      .upload(objectKey, buffer, {
        contentType: file.mimetype || 'application/pdf',
        upsert: false,
      });

    if (error) {
      this.logger.error(`Failed to upload policy file: ${error.message}`);
      throw new ServiceUnavailableException(
        `Unable to upload policy file to storage: ${error.message}`,
      );
    }

    return {
      bucket: POLICY_STORAGE_BUCKET,
      objectKey,
      /** Stored on Policy.filePath */
      filePath: this.toStorageFilePath(objectKey),
    };
  }

  async createSignedUrl(filePath: string) {
    const client = this.getClient();
    const objectKey = this.toObjectKey(filePath);

    const { data, error } = await client.storage
      .from(POLICY_STORAGE_BUCKET)
      .createSignedUrl(objectKey, SIGNED_URL_EXPIRES_IN_SECONDS);

    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException(
        error?.message ?? 'Unable to create a signed URL for this policy file.',
      );
    }

    return data.signedUrl;
  }

  async downloadFile(filePath: string) {
    const client = this.getClient();
    const objectKey = this.toObjectKey(filePath);

    const { data, error } = await client.storage
      .from(POLICY_STORAGE_BUCKET)
      .download(objectKey);

    if (error || !data) {
      throw new ServiceUnavailableException(
        error?.message ?? 'Unable to download policy file from storage.',
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  isStorageFilePath(filePath: string) {
    return filePath.startsWith('storage:');
  }

  isLegacyLocalFilePath(filePath: string) {
    return filePath.startsWith('/uploads/');
  }

  private async ensurePoliciesBucket() {
    if (!this.isConfigured()) {
      return;
    }

    const client = this.getClient();
    const { data: buckets, error: listError } =
      await client.storage.listBuckets();

    if (listError) {
      this.logger.warn(`Unable to list storage buckets: ${listError.message}`);
      return;
    }

    const exists = (buckets ?? []).some(
      (bucket) => bucket.name === POLICY_STORAGE_BUCKET,
    );

    if (exists) {
      return;
    }

    const { error } = await client.storage.createBucket(POLICY_STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: '50MB',
      allowedMimeTypes: [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });

    if (error) {
      this.logger.warn(
        `Unable to create "${POLICY_STORAGE_BUCKET}" bucket automatically: ${error.message}. Create it manually in the Supabase dashboard (private).`,
      );
      return;
    }

    this.logger.log(`Created private Supabase Storage bucket "${POLICY_STORAGE_BUCKET}".`);
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !serviceRoleKey) {
      throw new ServiceUnavailableException(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for policy file storage.',
      );
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return this.client;
  }

  private buildObjectKey(originalName: string) {
    const extension = extname(originalName).toLowerCase() || '.pdf';
    const baseName = originalName
      .replace(extension, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);

    return `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName || 'policy'}${extension}`;
  }

  private toStorageFilePath(objectKey: string) {
    return `storage:${objectKey}`;
  }

  private toObjectKey(filePath: string) {
    if (filePath.startsWith('storage:')) {
      return filePath.slice('storage:'.length);
    }

    // Accept raw object keys for flexibility.
    return filePath.replace(/^\/+/, '');
  }
}
