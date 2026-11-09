import { Module } from '@nestjs/common';
import { SlaPoliciesController } from './sla-policies.controller';
import { SlaPoliciesRepository } from './sla-policies.repository';
import { SlaPoliciesService } from './sla-policies.service';

@Module({
  controllers: [SlaPoliciesController],
  providers: [SlaPoliciesService, SlaPoliciesRepository],
  exports: [SlaPoliciesRepository],
})
export class SlaPoliciesModule {}
