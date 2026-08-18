import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  UploadsService,
  type UploadKind,
  type UploadPurpose,
} from './uploads.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

const PURPOSES: UploadPurpose[] = ['product', 'category', 'hero', 'editorial'];

const BINARY_BODY = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
      purpose: { type: 'string', enum: PURPOSES },
    },
  },
};

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Upload a catalogue image (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(BINARY_BODY)
  // Buffered rather than streamed straight through so an oversized or
  // wrong-typed file is rejected before it ever reaches Cloudinary.
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  upload(@UploadedFile() file?: Express.Multer.File, @Body('purpose') purpose?: string) {
    return this.store(file, 'image', purpose, 'image');
  }

  /**
   * A separate route rather than a branch inside the image one: multer's
   * `fileSize` limit is fixed per interceptor and applies before the mime type
   * is known, so sharing a route would mean accepting 50 MB for everything and
   * letting an enormous JPEG through.
   */
  @Post('video')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Upload a hero video (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(BINARY_BODY)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_VIDEO_BYTES } }),
  )
  uploadVideo(@UploadedFile() file?: Express.Multer.File, @Body('purpose') purpose?: string) {
    return this.store(file, 'video', purpose, 'video');
  }

  /**
   * Takes the public id as a query parameter rather than a path segment: a
   * Cloudinary id contains slashes, so it cannot be one. The service refuses
   * anything outside this store's root folder.
   */
  @Delete()
  @Roles(Role.Admin)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an uploaded asset (admin)' })
  @ApiQuery({ name: 'publicId', example: 'versacollections/2026/_staging/abc123' })
  @ApiQuery({ name: 'kind', enum: ['image', 'video'], required: false })
  async remove(@Query('publicId') publicId?: string, @Query('kind') kind?: string) {
    if (!publicId) throw new BadRequestException('publicId is required');
    await this.uploadsService.destroy(publicId, kind === 'video' ? 'video' : 'image');
  }

  private store(
    file: Express.Multer.File | undefined,
    kind: UploadKind,
    purpose: string | undefined,
    noun: string,
  ) {
    if (!file) throw new BadRequestException(`Attach ${noun === 'video' ? 'a' : 'an'} ${noun} as "file"`);

    // An unrecognised purpose stages rather than erroring — the worst case is a
    // file that needs filing, not a failed upload.
    const resolved = PURPOSES.includes(purpose as UploadPurpose)
      ? (purpose as UploadPurpose)
      : 'product';

    return this.uploadsService.save(file, kind, resolved);
  }
}
