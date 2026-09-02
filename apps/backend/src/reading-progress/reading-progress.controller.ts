import { Body, Controller, Get, Headers, Param, Put, Query } from '@nestjs/common';
import { ReadingProgressService } from './reading-progress.service';

function withActor(
  input: Record<string, unknown>,
  userId?: string,
  email?: string,
) {
  return {
    ...input,
    userId:
      typeof input.userId === 'string' && input.userId.trim()
        ? input.userId
        : userId,
    email:
      typeof input.email === 'string' && input.email.trim()
        ? input.email
        : email,
  };
}

@Controller('reading-progress')
export class ReadingProgressController {
  constructor(private readonly readingProgressService: ReadingProgressService) {}

  @Get()
  listForUser(
    @Query() query: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
    @Headers('x-hinora-user-email') email?: string,
  ) {
    return this.readingProgressService.listForUser(withActor(query, userId, email));
  }

  @Get(':policyId')
  getForUserPolicy(
    @Param('policyId') policyId: string,
    @Query() query: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
    @Headers('x-hinora-user-email') email?: string,
  ) {
    return this.readingProgressService.getForUserPolicy(
      policyId,
      withActor(query, userId, email),
    );
  }

  @Put()
  upsertProgress(
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
    @Headers('x-hinora-user-email') email?: string,
  ) {
    return this.readingProgressService.upsertProgress(withActor(body, userId, email));
  }
}
