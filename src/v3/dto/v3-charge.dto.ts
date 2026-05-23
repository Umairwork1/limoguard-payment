import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class V3ChargeDto {
  @ApiPropertyOptional({
    example: 'TKN-0fb06aac-634d-418a-bf78-953202b67b53',
    description: 'Saved card token (FastPay / Bypass3DS — no CVV needed). Use this OR sessionId.',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    example: 'KWT-f2589d21-11fb-4b91-8b7a-4d3866837645',
    description:
      'SessionId from the COLLECT_DETAILS callback. The customer already entered CVV via the ' +
      'MyFatoorah SDK; pass the sessionId here to complete the charge.',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ example: 10, description: 'Amount to charge' })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: '#CUST-001' })
  @IsOptional()
  @IsString()
  customerReference?: string;

  @ApiPropertyOptional({ enum: ['EN', 'AR'], default: 'EN' })
  @IsOptional()
  @IsEnum(['EN', 'AR'])
  language?: string = 'EN';
}
