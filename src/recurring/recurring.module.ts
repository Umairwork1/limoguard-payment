import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';
import { RecurringRecord, RecurringRecordSchema } from './schemas/recurring-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecurringRecord.name, schema: RecurringRecordSchema },
    ]),
  ],
  controllers: [RecurringController],
  providers: [RecurringService],
})
export class RecurringModule {}
