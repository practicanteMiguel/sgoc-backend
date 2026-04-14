import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { PassThrough } from 'stream';

@Injectable()
export class DriveService implements OnModuleInit {
  private drive!: drive_v3.Drive;
  readonly rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  onModuleInit() {
    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new InternalServerErrorException(
        'Faltan variables de Google Drive: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN',
      );
    }
    if (!this.rootFolderId) {
      throw new InternalServerErrorException('GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado');
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    this.drive = google.drive({ version: 'v3', auth });
  }

  async findOrCreateFolder(name: string, parentId: string): Promise<string> {
    const safe = name.replace(/'/g, "\\'");
    const res = await this.drive.files.list({
      q: `name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    });
    if (res.data.files?.length) return res.data.files[0].id!;

    const folder = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });
    return folder.data.id!;
  }

  async folderExists(folderId: string): Promise<boolean> {
    try {
      const res = await this.drive.files.get({ fileId: folderId, fields: 'id,trashed' });
      return !res.data.trashed;
    } catch {
      return false;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
    } catch (err: any) {
      // Si ya no existe en Drive no es un error bloqueante
      if (err?.response?.status !== 404) throw err;
    }
  }

  async uploadFile(
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    parentId: string,
  ): Promise<{ fileId: string; webViewLink: string }> {
    const stream = new PassThrough();
    stream.end(buffer);

    const res = await this.drive.files.create({
      requestBody: { name: fileName, parents: [parentId] },
      media: { mimeType, body: stream },
      fields: 'id,webViewLink',
    });
    return { fileId: res.data.id!, webViewLink: res.data.webViewLink! };
  }
}
