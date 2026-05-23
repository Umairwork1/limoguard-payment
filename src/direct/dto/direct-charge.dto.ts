import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DirectChargeDto {
  @ApiProperty({ example: 10.5, description: 'Amount to charge the customer' })
  @Min(0.001)
  @Type(() => Number)
  invoiceValue: number;

  @ApiPropertyOptional({
    example: 'KWD',
    enum: ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'],
    default: 'KWD',
    description: 'Currency to display to the customer',
  })
  @IsOptional()
  @IsString()
  currencyIso?: string = 'KWD';

  @ApiPropertyOptional({ enum: ['en', 'ar'], default: 'en' })
  @IsOptional()
  @IsEnum(['en', 'ar'])
  language?: string = 'en';

  @ApiPropertyOptional({ description: 'Your internal reference for this specific charge' })
  @IsOptional()
  @IsString()
  customerReference?: string;
}
