import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterTokenDto {
  @ApiProperty({ example: 2, description: 'Payment method ID from InitiatePayment response' })
  @IsInt()
  @Type(() => Number)
  paymentMethodId: number;

  @ApiProperty({ example: 1.0, description: 'Amount to charge for the first/registration payment' })
  @Min(0.001)
  @Type(() => Number)
  invoiceValue: number;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ example: '96512345678' })
  @IsString()
  customerMobile: string;

  @ApiPropertyOptional({
    example: 'KWD',
    enum: ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'],
    default: 'KWD',
  })
  @IsOptional()
  @IsString()
  displayCurrencyIso?: string = 'KWD';

  @ApiPropertyOptional({ enum: ['en', 'ar'], default: 'en' })
  @IsOptional()
  @IsEnum(['en', 'ar'])
  language?: string = 'en';

  @ApiPropertyOptional({
    example: 'http://yourdomain.com/api/direct/callback',
    description: 'URL MyFatoorah redirects to after successful card registration',
  })
  @IsOptional()
  @IsString()
  callBackUrl?: string;

  @ApiPropertyOptional({
    example: 'http://yourdomain.com/api/direct/error',
    description: 'URL MyFatoorah redirects to on failure',
  })
  @IsOptional()
  @IsString()
  errorUrl?: string;

  @ApiPropertyOptional({ description: 'Your internal customer/order reference' })
  @IsOptional()
  @IsString()
  customerReference?: string;
}
