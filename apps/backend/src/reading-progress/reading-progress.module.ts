import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingProgressController } from './reading-progress.controller';
import { ReadingProgressService } from './reading-progress.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReadingProgressController],
  providers: [ReadingProgressService],
  exports: [ReadingProgressService],
})
export class ReadingProgressModule {}
