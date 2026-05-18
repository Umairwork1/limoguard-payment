import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum RecurringType {
  Custom = 'Custom',
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}

export class RecurringModelDto {
  @ApiProperty({
    enum: RecurringType,
    example: RecurringType.Monthly,
    description: 'Frequency type for the recurring charge',
  })
  @IsEnum(RecurringType)
  recurringType: RecurringType;

  @ApiPropertyOptional({
    example: 30,
    description: 'Days between charges (1–180). Required when RecurringType is Custom.',
    minimum: 1,
    maximum: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  @Type(() => Number)
  intervalDays?: number;

  @ApiProperty({
    example: 12,
    description: 'Total number of charges. Use 0 for unlimited.',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  iteration: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of retry attempts on failed payment (0–5).',
    minimum: 0,
    maximum: 5,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  retryCount?: number = 0;
}
