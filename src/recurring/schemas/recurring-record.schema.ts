import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RecurringRecordDocument = RecurringRecord & Document;

@Schema({ timestamps: true })
export class RecurringRecord {
  @Prop({ required: true, unique: true })
  recurringId: string;

  @Prop()
  invoiceId: string;

  @Prop()
  invoiceUrl: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerEmail: string;

  @Prop()
  customerMobile: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'KWD' })
  currencyIso: string;

  @Prop({ enum: ['Custom', 'Daily', 'Weekly', 'Monthly'], required: true })
  recurringType: string;

  @Prop()
  intervalDays: number;

  @Prop({ default: 0 })
  iteration: number;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 'Draft' })
  status: string;

  @Prop({ type: Object })
  rawResponse: Record<string, unknown>;
}

export const RecurringRecordSchema = SchemaFactory.createForClass(RecurringRecord);
