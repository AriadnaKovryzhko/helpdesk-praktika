import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class AttachmentStorageService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await mkdir(this.directory(), { recursive: true });
  }

  async save(buffer: Buffer, extension: string): Promise<string> {
    const storedName = `${randomUUID()}.${extension}`;
    await writeFile(this.pathOf(storedName), buffer);
    return storedName;
  }

  open(storedName: string): ReadStream {
    return createReadStream(this.pathOf(storedName));
  }

  async remove(storedName: string): Promise<void> {
    await rm(this.pathOf(storedName), { force: true });
  }

  private directory(): string {
    return this.config.get<string>('UPLOAD_DIR') ?? 'uploads';
  }

  private pathOf(storedName: string): string {
    return join(this.directory(), storedName);
  }
}
