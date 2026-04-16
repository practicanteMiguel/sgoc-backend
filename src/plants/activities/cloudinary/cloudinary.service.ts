import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload failed'));
          resolve(result.secure_url);
        },
      );
      Readable.from(file.buffer).pipe(stream);
    });
  }

  buildFolder(fieldName: string, year: number, crewName: string, week: number): string {
    const s = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
    return `${s(fieldName)}/${year}/${s(crewName)}/week_${week}`;
  }
}
