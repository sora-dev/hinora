import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyAnalysisService } from './policy-analysis.service';
import { PolicyContentExtractorService } from './policy-content-extractor.service';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

@Module({
  imports: [PrismaModule],
  controllers: [PoliciesController],
  providers: [
    PoliciesService,
    PolicyContentExtractorService,
    PolicyAnalysisService,
  ],
})
export class PoliciesModule {}
