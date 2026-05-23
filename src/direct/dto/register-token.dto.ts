import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterTokenDto {
  @ApiProperty({
    example: 1.0,
    description: 'Amount charged for the first/registration payment (used to verify the card)',
  })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  invoiceValue!: number;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  customerName!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  customerEmail!: string;

  @ApiProperty({ example: '+965', description: 'Country code with + prefix' })
  @IsString()
  customerMobileCountryCode!: string;

  @ApiProperty({ example: '51234567', description: 'Mobile number without country code' })
  @IsString()
  customerMobileNumber!: string;

  @ApiProperty({
    example: 'customer-001',
    description: 'Unique customer reference from your system — used to identify the customer for future charges',
  })
  @IsString()
  customerReference!: string;

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
    example: 'https://yourdomain.com/api/direct/callback',
    description: 'Override the default callback URL',
  })
  @IsOptional()
  @IsString()
  callBackUrl?: string;

  @ApiPropertyOptional({
    example: 'https://yourdomain.com/api/direct/error',
    description: 'Override the default error URL',
  })
  @IsOptional()
  @IsString()
  errorUrl?: string;
}
