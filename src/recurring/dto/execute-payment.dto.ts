import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringModelDto } from './recurring-model.dto';

export class ExecutePaymentDto {
  @ApiProperty({ example: 2, description: 'Payment method ID from InitiatePayment response' })
  @IsInt()
  @Type(() => Number)
  paymentMethodId: number;

  @ApiProperty({ example: 10.5, description: 'Invoice amount to charge the customer' })
  @Min(0.001)
  @Type(() => Number)
  invoiceValue: number;

  @ApiProperty({ example: 'John Doe', description: 'Customer full name' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Customer email address' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ example: '96512345678', description: 'Customer mobile number' })
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

  @ApiPropertyOptional({
    enum: ['en', 'ar'],
    default: 'en',
    description: 'Checkout page language',
  })
  @IsOptional()
  @IsEnum(['en', 'ar'])
  language?: string = 'en';

  @ApiPropertyOptional({
    example: 'http://localhost:3001/api/recurring/callback',
    description: 'URL MyFatoorah redirects to on payment success',
  })
  @IsOptional()
  @IsString()
  callBackUrl?: string;

  @ApiPropertyOptional({
    example: 'http://localhost:3001/api/recurring/error',
    description: 'URL MyFatoorah redirects to on payment failure',
  })
  @IsOptional()
  @IsString()
  errorUrl?: string;

  @ApiPropertyOptional({ description: 'Optional reference from your system' })
  @IsOptional()
  @IsString()
  customerReference?: string;

  @ApiProperty({ description: 'Recurring payment configuration', type: RecurringModelDto })
  @ValidateNested()
  @Type(() => RecurringModelDto)
  recurringModel: RecurringModelDto;
}
