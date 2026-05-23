import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type V3SessionDocument = V3Session & Document;

@Schema({ timestamps: true })
export class V3Session {
  @Prop({ required: true })
  customerReference: string;

  @Prop()
  sessionId: string;

  @Prop()
  sessionExpiry: Date;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'KWD' })
  currency: string;

  @Prop({ default: 'Pending', enum: ['Pending', 'Paid'] })
  status: string;

  @Prop({ type: Object })
  rawResponse: Record<string, unknown>;
}

export const V3SessionSchema = SchemaFactory.createForClass(V3Session);
