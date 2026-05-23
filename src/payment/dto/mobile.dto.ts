import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MobileDto {
  @ApiProperty({ example: '+965' })
  @IsString()
  countryCode!: string;

  @ApiProperty({ example: '51234567' })
  @IsString()
  number!: string;
}
