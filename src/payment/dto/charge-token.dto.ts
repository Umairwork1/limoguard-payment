import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ChargeTokenDto {
  @ApiProperty({ example: 'TKN-0fb06aac-634d-418a-bf78-953202b67b53', description: 'Saved card token' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 10.5, description: 'Amount to charge' })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  invoiceValue!: number;

  @ApiPropertyOptional({ example: 'KWD', default: 'KWD' })
  @IsOptional()
  @IsString()
  currency?: string = 'KWD';

  @ApiPropertyOptional({ example: 'order-ref-001', description: 'Your internal order reference' })
  @IsOptional()
  @IsString()
  orderReference?: string;
}
