import { OmitType, PartialType } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

const MAX_MINUTES = 525_600;
const MINUTES_MESSAGE = `Укажите целое число минут от 1 до ${MAX_MINUTES}`;

export class CreateSlaPolicyDto {
  @IsEnum(TicketPriority, { message: 'Выберите приоритет из списка' })
  priority: TicketPriority;

  @IsInt({ message: MINUTES_MESSAGE })
  @Min(1, { message: MINUTES_MESSAGE })
  @Max(MAX_MINUTES, { message: MINUTES_MESSAGE })
  reactionMinutes: number;

  @IsInt({ message: MINUTES_MESSAGE })
  @Min(1, { message: MINUTES_MESSAGE })
  @Max(MAX_MINUTES, { message: MINUTES_MESSAGE })
  resolutionMinutes: number;
}

export class UpdateSlaPolicyDto extends PartialType(
  OmitType(CreateSlaPolicyDto, ['priority'] as const),
) {}
