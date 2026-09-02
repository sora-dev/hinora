import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { PoliciesService } from './policies.service';

const policyUploadStorage = memoryStorage();

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  listPolicies(
    @Query() query: Record<string, string | undefined>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.policiesService.listPolicies(query, userId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: policyUploadStorage,
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  uploadPolicy(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.policiesService.uploadPolicy(file, body);
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: policyUploadStorage,
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  updatePolicy(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.policiesService.updatePolicy(id, file, body);
  }

  @Get(':id/file')
  async getPolicyFile(
    @Param('id') id: string,
    @Query() query: Record<string, string | undefined>,
    @Headers('x-hinora-user-id') userId: string | undefined,
    @Res() response: Response,
  ) {
    const result = await this.policiesService.getPolicyFile(id, query, userId);

    if (result.kind === 'redirect') {
      return response.redirect(result.url);
    }

    response.setHeader('Content-Type', result.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${result.fileName.replace(/"/g, '')}"`,
    );
    return response.send(result.buffer);
  }

  @Post(':id/reanalyze')
  reanalyzePolicy(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.policiesService.reanalyzePolicy(id, body);
  }

  @Get(':id')
  getPolicy(
    @Param('id') id: string,
    @Query() query: Record<string, string | undefined>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.policiesService.getPolicyById(id, query, userId);
  }
}
