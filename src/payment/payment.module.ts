import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentToken, PaymentTokenSchema } from './schemas/payment-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PaymentToken.name, schema: PaymentTokenSchema }]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
