import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlaService } from './sla.service';

@Injectable()
export class SlaScheduler {
  constructor(private readonly sla: SlaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    await this.sla.markBreaches();
  }
}
