import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DirectChargeDto {
  @ApiProperty({
    example: 10.5,
    description: 'Amount to charge the customer using the saved token',
  })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  invoiceValue: number;

  @ApiPropertyOptional({
    example: 'KWD',
    enum: ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'],
    default: 'KWD',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'KWD';

  @ApiPropertyOptional({ enum: ['EN', 'AR'], default: 'EN' })
  @IsOptional()
  @IsEnum(['EN', 'AR'])
  language?: string = 'EN';

  @ApiPropertyOptional({
    example: 'order-invoice-001',
    description: 'Your internal reference for this specific charge',
  })
  @IsOptional()
  @IsString()
  orderReference?: string;
}
