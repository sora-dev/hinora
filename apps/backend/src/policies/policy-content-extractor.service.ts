import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import { extname, isAbsolute, join } from 'node:path';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PolicyContentExtractorService {
  private readonly logger = new Logger(PolicyContentExtractorService.name);

  async extractFromUploadedFile(
    file: Pick<Express.Multer.File, 'path' | 'mimetype' | 'buffer' | 'originalname'>,
  ): Promise<string | null> {
    if (file.buffer && file.buffer.length > 0) {
      return this.extractFromBuffer(
        file.buffer,
        file.mimetype,
        file.originalname,
      );
    }

    if (file.path) {
      return this.extractFromAbsoluteFilePath(file.path, file.mimetype);
    }

    return null;
  }

  async extractFromBuffer(
    buffer: Buffer,
    fileType: string,
    fileNameHint = 'document.pdf',
  ): Promise<string | null> {
    try {
      const extension = extname(fileNameHint).toLowerCase();
      const normalizedFileType = fileType.toLowerCase();

      if (normalizedFileType.includes('pdf') || extension === '.pdf') {
        const parser = new PDFParse({ data: buffer });

        try {
          const parsed = await parser.getText();
          return this.normalizeExtractedText(parsed.text);
        } finally {
          await parser.destroy();
        }
      }

      if (
        normalizedFileType.startsWith('text/') ||
        extension === '.txt' ||
        extension === '.md'
      ) {
        return this.normalizeExtractedText(buffer.toString('utf8'));
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown extraction error.';

      this.logger.warn(
        `Unable to extract policy content from buffer (${fileNameHint}): ${message}`,
      );
    }

    return null;
  }

  async extractFromStoredFile(
    filePath: string,
    fileType: string,
  ): Promise<string | null> {
    const absoluteFilePath = this.resolveStoredFilePath(filePath);

    if (!absoluteFilePath) {
      return null;
    }

    return this.extractFromAbsoluteFilePath(absoluteFilePath, fileType);
  }

  private async extractFromAbsoluteFilePath(
    absoluteFilePath: string,
    fileType: string,
  ): Promise<string | null> {
    if (!fs.existsSync(absoluteFilePath)) {
      return null;
    }

    try {
      const buffer = await fsPromises.readFile(absoluteFilePath);
      return this.extractFromBuffer(buffer, fileType, absoluteFilePath);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown extraction error.';

      this.logger.warn(
        `Unable to extract policy content from ${absoluteFilePath}: ${message}`,
      );
      return null;
    }
  }

  private resolveStoredFilePath(filePath: string) {
    const trimmedPath = filePath.trim();

    if (!trimmedPath || trimmedPath.startsWith('storage:')) {
      return null;
    }

    const normalizedPath = trimmedPath.replace(/^\/+/, '');
    const candidates = [
      isAbsolute(trimmedPath) ? trimmedPath : join(process.cwd(), normalizedPath),
      join(process.cwd(), 'apps', 'backend', normalizedPath),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }

  private normalizeExtractedText(text: string | null | undefined) {
    if (!text) {
      return null;
    }

    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\u0000/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return normalizedText.length > 0 ? normalizedText : null;
  }
}
