import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { extname } from 'node:path';
import {
  currentYear,
  editorialFolder,
  folderOf,
  heroFolder,
  isInsideRoot,
  nameOf,
  stagingFolder,
  yearOf,
} from './folders';

/**
 * Extensions we are willing to accept, keyed by the mime type the browser
 * reports. Both must match — a `.jpg` carrying `text/html` is rejected, and so
 * is an `image/jpeg` arriving as `.svg` (SVG can carry script).
 *
 * Split by kind so an image route can never be talked into accepting a video,
 * which is what keeps the two size caps meaningful.
 */
const ALLOWED_IMAGE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const ALLOWED_VIDEO: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

export type UploadKind = 'image' | 'video';

/** What the file is for, which decides whether it stages or is filed at once. */
export type UploadPurpose = 'product' | 'category' | 'hero' | 'editorial';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Legacy prefix. Nothing new is written here; old order snapshots still use it. */
export const UPLOAD_URL_PREFIX = '/uploads';

export interface StoredMedia {
  url: string;
  publicId: string;
}

/**
 * Purposes that belong to the settings singleton, which has no id to wait for —
 * these are filed on upload. Anything absent here stages instead.
 */
const UNSTAGED: Partial<Record<UploadPurpose, (root: string, year: string) => string>> = {
  hero: heroFolder,
  editorial: editorialFolder,
};

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private readonly root: string;
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    const creds = this.config.getOrThrow<{
      cloudName: string;
      apiKey: string;
      apiSecret: string;
      rootFolder: string;
    }>('app.cloudinary');

    this.root = creds.rootFolder;
    this.configured = Boolean(creds.cloudName && creds.apiKey && creds.apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: creds.cloudName,
        api_key: creds.apiKey,
        api_secret: creds.apiSecret,
        secure: true,
      });
    }
  }

  onModuleInit(): void {
    // Loud at boot rather than silent until the first upload fails.
    if (!this.configured) {
      this.logger.warn(
        'Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and ' +
          'CLOUDINARY_API_SECRET. Uploads will be refused until you do.',
      );
    }
  }

  get rootFolder(): string {
    return this.root;
  }

  /**
   * Sends a validated file to Cloudinary.
   *
   * `product` and `category` uploads land in `_staging`: the product they
   * belong to may not exist yet, so they are filed properly once it is saved.
   * Hero and editorial media go straight to their final home — the settings
   * singleton has no id to wait for.
   */
  async save(
    file: Express.Multer.File,
    kind: UploadKind = 'image',
    purpose: UploadPurpose = 'product',
  ): Promise<StoredMedia> {
    this.assertConfigured();

    const table = kind === 'video' ? ALLOWED_VIDEO : ALLOWED_IMAGE;
    const extension = table[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        kind === 'video'
          ? `Unsupported video type "${file.mimetype}". Use MP4 or WebM.`
          : `Unsupported image type "${file.mimetype}". Use JPEG, PNG, WebP or AVIF.`,
      );
    }
    if (extname(file.originalname).toLowerCase().replace('.jpeg', '.jpg') !== extension) {
      // Guards against a mislabelled upload, e.g. a script renamed to .png.
      this.logger.warn(`Extension/mime mismatch on "${file.originalname}" (${file.mimetype})`);
    }

    const year = currentYear();
    const folder = UNSTAGED[purpose]?.(this.root, year) ?? stagingFolder(this.root, year);

    const result = await this.uploadBuffer(file.buffer, folder, kind);
    return { url: result.secure_url, publicId: result.public_id };
  }

  /**
   * Files an asset into its final folder.
   *
   * Idempotent by design: the caller recomputes the target on every save, so an
   * asset already in the right place returns untouched rather than making a
   * pointless round trip. The year is taken from the asset, not the clock, so
   * re-filing a 2026 product in January does not drag it into 2027.
   */
  async moveTo(current: StoredMedia, targetFolder: string, kind: UploadKind): Promise<StoredMedia> {
    if (!this.configured || !current.publicId) return current;
    if (folderOf(current.publicId) === targetFolder) return current;

    const destination = `${targetFolder}/${nameOf(current.publicId)}`;
    const result = await cloudinary.uploader.rename(current.publicId, destination, {
      resource_type: kind,
      overwrite: true,
      invalidate: true,
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  /** The year an asset is already filed under — used to keep a move in-year. */
  yearFor(publicId: string): string {
    return yearOf(this.root, publicId);
  }

  async destroy(publicId: string, kind: UploadKind = 'image'): Promise<void> {
    // Validate the input before complaining about server state: a malformed
    // request is a 400 whether or not Cloudinary happens to be configured.
    if (!isInsideRoot(this.root, publicId)) {
      throw new BadRequestException(`Not an asset of this store (expected "${this.root}/…")`);
    }

    this.assertConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: kind, invalidate: true });
  }

  /**
   * The SDK's stream uploader wrapped in a promise. Streaming rather than a
   * base64 data URI keeps a 50 MB video from being expanded by a third in
   * memory on its way out.
   */
  private uploadBuffer(
    buffer: Buffer,
    folder: string,
    kind: UploadKind,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: kind, overwrite: false, unique_filename: true },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException(error?.message ?? 'Cloudinary upload failed'),
            );
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured on this server. Ask an administrator to set the ' +
          'CLOUDINARY_* environment variables.',
      );
    }
  }
}
