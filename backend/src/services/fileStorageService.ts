import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface FileStorageConfig {
  type: 'local' | 's3' | 'gcs' | 'azure';
  localPath?: string;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    analysisBucket?: string;
    tempBucket?: string;
  };
  gcsConfig?: {
    bucket: string;
    projectId: string;
    keyFilename: string;
  };
  azureConfig?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
}

export interface UploadResult {
  success: boolean;
  filePath?: string;
  url?: string;
  key?: string;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  stream?: NodeJS.ReadableStream;
  url?: string;
  error?: string;
}

class FileStorageService {
  private config: FileStorageConfig;
  private s3Client?: S3Client;

  constructor(config: FileStorageConfig) {
    this.config = config;

    if (config.type === 's3' && config.s3Config) {
      this.s3Client = new S3Client({
        region: config.s3Config.region,
        credentials: {
          accessKeyId: config.s3Config.accessKeyId,
          secretAccessKey: config.s3Config.secretAccessKey,
        },
      });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    projectId: string,
    userId: string,
    metadata?: Record<string, any>,
    fileType: 'general' | 'analysis' | 'temp' = 'general'
  ): Promise<UploadResult> {
    try {
      const fileName = `${projectId}/${userId}/${Date.now()}-${file.originalname}`;

      switch (this.config.type) {
        case 'local':
          return await this.uploadToLocal(file, fileName);

        case 's3':
          return await this.uploadToS3(file, fileName, metadata, fileType);

        case 'gcs':
          return await this.uploadToGCS(file, fileName, metadata);

        case 'azure':
          return await this.uploadToAzure(file, fileName, metadata);

        default:
          throw new Error(`Unsupported storage type: ${this.config.type}`);
      }
    } catch (error: any) {
      logger.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async downloadFile(filePath: string): Promise<DownloadResult> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.downloadFromLocal(filePath);

        case 's3':
          return await this.downloadFromS3(filePath);

        case 'gcs':
          return await this.downloadFromGCS(filePath);

        case 'azure':
          return await this.downloadFromAzure(filePath);

        default:
          throw new Error(`Unsupported storage type: ${this.config.type}`);
      }
    } catch (error: any) {
      logger.error('File download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.deleteFromLocal(filePath);

        case 's3':
          return await this.deleteFromS3(filePath);

        case 'gcs':
          return await this.deleteFromGCS(filePath);

        case 'azure':
          return await this.deleteFromAzure(filePath);

        default:
          throw new Error(`Unsupported storage type: ${this.config.type}`);
      }
    } catch (error: any) {
      logger.error('File deletion error:', error);
      return false;
    }
  }

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      switch (this.config.type) {
        case 's3':
          return await this.getS3SignedUrl(filePath, expiresIn);

        case 'gcs':
          return await this.getGCSSignedUrl(filePath, expiresIn);

        case 'azure':
          return await this.getAzureSignedUrl(filePath, expiresIn);

        case 'local':
          // For local files, return the direct path
          return filePath;

        default:
          return null;
      }
    } catch (error: any) {
      logger.error('Signed URL generation error:', error);
      return null;
    }
  }

  // Local storage methods
  private async uploadToLocal(file: Express.Multer.File, fileName: string): Promise<UploadResult> {
    const uploadDir = this.config.localPath || path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadDir, fileName);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.copyFileSync(file.path, fullPath);

    return {
      success: true,
      filePath: fullPath,
      url: `/uploads/${fileName}`
    };
  }

  private async downloadFromLocal(filePath: string): Promise<DownloadResult> {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const stream = fs.createReadStream(filePath);
    return { success: true, stream };
  }

  private async deleteFromLocal(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error: any) {
      return false;
    }
  }

  // S3 storage methods
  private async uploadToS3(
    file: Express.Multer.File,
    fileName: string,
    metadata?: Record<string, any>,
    fileType: 'general' | 'analysis' | 'temp' = 'general'
  ): Promise<UploadResult> {
    if (!this.s3Client || !this.config.s3Config) {
      throw new Error('S3 client not configured');
    }

    // Determine bucket and prefix based on fileType
    let targetBucket = this.config.s3Config.bucket;
    let targetPrefix = '';

    if (fileType === 'analysis' && this.config.s3Config.analysisBucket) {
      const { bucket, prefix } = this.parseBucketConfig(this.config.s3Config.analysisBucket);
      targetBucket = bucket;
      targetPrefix = prefix;
    } else if (fileType === 'temp' && this.config.s3Config.tempBucket) {
      const { bucket, prefix } = this.parseBucketConfig(this.config.s3Config.tempBucket);
      targetBucket = bucket;
      targetPrefix = prefix;
    } else {
      // Fallback for general bucket if it has a prefix (though less likely for root bucket)
      const { bucket, prefix } = this.parseBucketConfig(targetBucket);
      targetBucket = bucket;
      targetPrefix = prefix;
    }

    // Construct the full key with prefix if it exists
    // Ensure no double slashes if prefix and fileName interacting, though fileName currently is "proj/user/timestamp-name"
    // If prefix is "analysis-files", key becomes "analysis-files/proj/user/timestamp-name"
    const key = targetPrefix ? `${targetPrefix}/${fileName}` : fileName;

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype,
      Metadata: metadata || {},
    });

    await this.s3Client.send(command);

    const url = `https://${targetBucket}.s3.${this.config.s3Config.region}.amazonaws.com/${key}`;

    return {
      success: true,
      filePath: key,
      url,
      key: key
    };
  }

  private parseBucketConfig(configString: string): { bucket: string; prefix: string } {
    const parts = configString.split('/');
    const bucket = parts[0];
    const prefix = parts.slice(1).join('/');
    return { bucket, prefix };
  }

  private async downloadFromS3(filePath: string): Promise<DownloadResult> {
    if (!this.s3Client || !this.config.s3Config) {
      throw new Error('S3 client not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.config.s3Config.bucket,
      Key: filePath,
    });

    const response = await this.s3Client.send(command);

    return {
      success: true,
      stream: response.Body as NodeJS.ReadableStream
    };
  }

  private async deleteFromS3(filePath: string): Promise<boolean> {
    if (!this.s3Client || !this.config.s3Config) {
      return false;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.s3Config.bucket,
        Key: filePath,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      return false;
    }
  }

  private async getS3SignedUrl(filePath: string, expiresIn: number): Promise<string> {
    if (!this.s3Client || !this.config.s3Config) {
      throw new Error('S3 client not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.config.s3Config.bucket,
      Key: filePath,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  // GCS storage methods (placeholder - would need @google-cloud/storage)
  private async uploadToGCS(file: Express.Multer.File, fileName: string, metadata?: Record<string, any>): Promise<UploadResult> {
    // Implementation would go here
    throw new Error('GCS implementation not yet available');
  }

  private async downloadFromGCS(filePath: string): Promise<DownloadResult> {
    throw new Error('GCS implementation not yet available');
  }

  private async deleteFromGCS(filePath: string): Promise<boolean> {
    throw new Error('GCS implementation not yet available');
  }

  private async getGCSSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    throw new Error('GCS implementation not yet available');
  }

  // Azure storage methods (placeholder - would need @azure/storage-blob)
  private async uploadToAzure(file: Express.Multer.File, fileName: string, metadata?: Record<string, any>): Promise<UploadResult> {
    throw new Error('Azure implementation not yet available');
  }

  private async downloadFromAzure(filePath: string): Promise<DownloadResult> {
    throw new Error('Azure implementation not yet available');
  }

  private async deleteFromAzure(filePath: string): Promise<boolean> {
    throw new Error('Azure implementation not yet available');
  }

  private async getAzureSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    throw new Error('Azure implementation not yet available');
  }
}

// Factory function to create storage service
export function createFileStorageService(): FileStorageService {
  const storageType = (process.env.FILE_STORAGE_TYPE || 'local') as 'local' | 's3' | 'gcs' | 'azure';

  const config: FileStorageConfig = {
    type: storageType,
    localPath: process.env.UPLOAD_DIR || 'uploads',
    s3Config: storageType === 's3' ? {
      bucket: process.env.AWS_S3_BUCKET || '',
      region: process.env.AWS_S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      analysisBucket: process.env.AWS_S3_ANALYSIS_BUCKET,
      tempBucket: process.env.AWS_S3_TEMP_BUCKET,
    } : undefined,
  };

  return new FileStorageService(config);
}

export default FileStorageService;
