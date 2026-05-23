import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentTokenDocument = PaymentToken & Document;

@Schema({ timestamps: true })
export class PaymentToken {
  @Prop({ sparse: true })
  sessionId!: string;

  @Prop({ sparse: true })
  paymentId!: string;

  @Prop({ sparse: true })
  invoiceId!: string;

  @Prop({ unique: true, sparse: true })
  token!: string;

  @Prop()
  encryptionKey!: string;

  @Prop()
  maskedCard!: string;

  @Prop()
  brand!: string;

  @Prop({ default: false })
  is3DSVerified!: boolean;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  customerEmail!: string;

  @Prop()
  customerMobile!: string;

  @Prop({ required: true, index: true })
  customerReference!: string;

  @Prop({ default: 'KWD' })
  currencyIso!: string;

  @Prop({ default: 'Pending', enum: ['Pending', 'Active', 'Charged', 'Cancelled'] })
  status!: string;

  @Prop()
  lastChargedAt!: Date;

  @Prop({ type: Object })
  rawResponse!: Record<string, unknown>;
}

export const PaymentTokenSchema = SchemaFactory.createForClass(PaymentToken);
