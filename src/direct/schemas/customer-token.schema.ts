import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerTokenDocument = CustomerToken & Document;

@Schema({ timestamps: true })
export class CustomerToken {
  @Prop({ unique: true, sparse: true })
  customerTokenId: string;

  @Prop({ required: true })
  paymentId: string;

  @Prop()
  paymentUrl: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerEmail: string;

  @Prop()
  customerMobile: string;

  @Prop({ required: true })
  customerReference: string;

  @Prop()
  paymentGateway: string;

  @Prop()
  maskedCard: string;

  @Prop({ default: 'KWD' })
  currencyIso: string;

  @Prop({ default: 'Pending', enum: ['Pending', 'Active', 'Deleted'] })
  status: string;

  @Prop({ type: Object })
  rawResponse: Record<string, unknown>;
}

export const CustomerTokenSchema = SchemaFactory.createForClass(CustomerToken);
