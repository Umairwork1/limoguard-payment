import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { V3Controller } from './v3.controller';
import { V3Service } from './v3.service';
import { V3Session, V3SessionSchema } from './schemas/v3-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: V3Session.name, schema: V3SessionSchema }]),
  ],
  controllers: [V3Controller],
  providers: [V3Service],
})
export class V3Module {}
