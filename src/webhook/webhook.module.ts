import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookEvent, WebhookEventSchema } from './schemas/webhook-event.schema';
import { RecurringRecord, RecurringRecordSchema } from '../recurring/schemas/recurring-record.schema';
import { CustomerToken, CustomerTokenSchema } from '../direct/schemas/customer-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookEvent.name, schema: WebhookEventSchema },
      { name: RecurringRecord.name, schema: RecurringRecordSchema },
      { name: CustomerToken.name, schema: CustomerTokenSchema },
    ]),
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
