import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MobileDto } from './mobile.dto';

export class CreateSessionDto {
  @ApiProperty({ example: 1.0, description: 'Amount for the initial payment / card verification' })
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

  @ApiProperty({ type: MobileDto })
  @ValidateNested()
  @Type(() => MobileDto)
  customerMobile!: MobileDto;

  @ApiProperty({ example: 'customer-001', description: 'Unique reference for this customer in your system' })
  @IsString()
  customerReference!: string;

  @ApiPropertyOptional({ example: 'KWD', enum: ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'], default: 'KWD' })
  @IsOptional()
  @IsString()
  currency?: string = 'KWD';

  @ApiPropertyOptional({ enum: ['EN', 'AR'], default: 'EN' })
  @IsOptional()
  @IsEnum(['EN', 'AR'])
  language?: string = 'EN';

  @ApiPropertyOptional({
    enum: ['COMPLETE_PAYMENT', 'COLLECT_DETAILS'],
    default: 'COMPLETE_PAYMENT',
    description: 'COMPLETE_PAYMENT = charge + save card. COLLECT_DETAILS = save card only.',
  })
  @IsOptional()
  @IsEnum(['COMPLETE_PAYMENT', 'COLLECT_DETAILS'])
  paymentMode?: string = 'COMPLETE_PAYMENT';

  @ApiPropertyOptional({ enum: ['PAY', 'AUTHORIZE', 'VERIFY'], default: 'PAY' })
  @IsOptional()
  @IsEnum(['PAY', 'AUTHORIZE', 'VERIFY'])
  operationType?: string = 'PAY';

  @ApiPropertyOptional({ example: ['card'], isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedPaymentMethods?: string[];

  @ApiPropertyOptional({ example: 'https://yourdomain.com/api/payment/callback' })
  @IsOptional()
  @IsString()
  callBackUrl?: string;

  @ApiPropertyOptional({ example: 'https://yourdomain.com/api/payment/error' })
  @IsOptional()
  @IsString()
  errorUrl?: string;
}
