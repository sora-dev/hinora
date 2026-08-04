import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import { extname, isAbsolute, join } from 'node:path';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PolicyContentExtractorService {
  private readonly logger = new Logger(PolicyContentExtractorService.name);

  async extractFromUploadedFile(
    file: Pick<Express.Multer.File, 'path' | 'mimetype'>,
  ): Promise<string | null> {
    return this.extractFromAbsoluteFilePath(file.path, file.mimetype);
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
      const extension = extname(absoluteFilePath).toLowerCase();
      const normalizedFileType = fileType.toLowerCase();

      if (
        normalizedFileType.includes('pdf') ||
        extension === '.pdf'
      ) {
        const buffer = await fsPromises.readFile(absoluteFilePath);
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
        const text = await fsPromises.readFile(absoluteFilePath, 'utf8');
        return this.normalizeExtractedText(text);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown extraction error.';

      this.logger.warn(
        `Unable to extract policy content from ${absoluteFilePath}: ${message}`,
      );
    }

    return null;
  }

  private resolveStoredFilePath(filePath: string) {
    const trimmedPath = filePath.trim();

    if (!trimmedPath) {
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
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return normalizedText.length > 0 ? normalizedText : null;
  }
}
