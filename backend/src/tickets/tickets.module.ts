import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { SlaPoliciesModule } from '../sla-policies/sla-policies.module';
import { SlaScheduler } from './sla.scheduler';
import { SlaService } from './sla.service';
import { TicketPolicyService } from './ticket-policy.service';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

@Module({
  imports: [CategoriesModule, SlaPoliciesModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository, TicketPolicyService, SlaService, SlaScheduler],
  exports: [TicketsService, TicketPolicyService, TicketsRepository],
})
export class TicketsModule {}
