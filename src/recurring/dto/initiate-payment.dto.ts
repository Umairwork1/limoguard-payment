import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InitiatePaymentDto {
  @ApiProperty({ example: 100, description: 'Amount to calculate charges for' })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  invoiceAmount: number;

  @ApiPropertyOptional({
    example: 'KWD',
    description: 'Currency ISO code',
    enum: ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'],
    default: 'KWD',
  })
  @IsOptional()
  @IsString()
  currencyIso: string = 'KWD';
}
