import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSessionDto {
  @ApiProperty({
    example: 10,
    description: 'Amount to charge the customer for the first (registration) payment',
  })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    example: '#CUST-001',
    description:
      'Unique customer reference from your system. Used to retrieve saved tokens via GET /v3/customers/:reference.',
  })
  @IsString()
  customerReference: string;

  @ApiPropertyOptional({
    example: 'KWD',
    enum: ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'],
    default: 'KWD',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'KWD';

  @ApiPropertyOptional({
    enum: ['COMPLETE_PAYMENT', 'COLLECT_DETAILS'],
    default: 'COMPLETE_PAYMENT',
    description:
      'COMPLETE_PAYMENT — MyFatoorah handles OTP and returns encrypted paymentData in callback. ' +
      'COLLECT_DETAILS — returns card details in callback; you must then call POST /v3/payments with the sessionId.',
  })
  @IsOptional()
  @IsEnum(['COMPLETE_PAYMENT', 'COLLECT_DETAILS'])
  paymentMode?: string = 'COMPLETE_PAYMENT';

  @ApiPropertyOptional({
    example: 'https://your-site.com/payment-callback',
    description: 'URL MyFatoorah redirects to after the customer completes payment',
  })
  @IsOptional()
  @IsString()
  redirectionUrl?: string;
}
