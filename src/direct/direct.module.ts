import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DirectController } from './direct.controller';
import { DirectService } from './direct.service';
import { CustomerToken, CustomerTokenSchema } from './schemas/customer-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CustomerToken.name, schema: CustomerTokenSchema }]),
  ],
  controllers: [DirectController],
  providers: [DirectService],
})
export class DirectModule {}
