import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'node:fs';
import { extname, join } from 'node:path';
import { PoliciesService } from './policies.service';

const uploadsDirectory = join(process.cwd(), 'uploads', 'policies');

function ensureUploadsDirectory() {
  if (!fs.existsSync(uploadsDirectory)) {
    fs.mkdirSync(uploadsDirectory, { recursive: true });
  }

  return uploadsDirectory;
}

const policyStorage = diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, ensureUploadsDirectory());
  },
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const name = file.originalname
      .replace(extension, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);

    callback(
      null,
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name || 'policy'}${extension}`,
    );
  },
});

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  listPolicies(@Query() query: Record<string, string | undefined>) {
    return this.policiesService.listPolicies(query);
  }

  @Get(':id')
  getPolicy(@Param('id') id: string) {
    return this.policiesService.getPolicyById(id);
  }

  @Post(':id/reanalyze')
  reanalyzePolicy(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.policiesService.reanalyzePolicy(id, body);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: policyStorage,
    }),
  )
  uploadPolicy(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.policiesService.uploadPolicy(file, body);
  }
}
