import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'customer-001', description: 'Customer reference used when creating the session' })
  @IsString()
  reference!: string;
}
