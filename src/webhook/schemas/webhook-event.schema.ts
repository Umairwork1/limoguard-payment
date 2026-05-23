import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebhookEventDocument = WebhookEvent & Document;

@Schema({ timestamps: true })
export class WebhookEvent {
  @Prop({ required: true })
  eventCode: number;

  @Prop({ required: true })
  eventName: string;

  @Prop()
  eventReference: string;

  @Prop()
  countryIsoCode: string;

  @Prop({ default: 'verified', enum: ['verified', 'signature_mismatch', 'no_secret'] })
  signatureStatus: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ default: 'received', enum: ['received', 'processed', 'ignored'] })
  processingStatus: string;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
