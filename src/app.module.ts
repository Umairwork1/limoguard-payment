import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RecurringModule } from './recurring/recurring.module';
import { DirectModule } from './direct/direct.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/myfatoorah_recurring',
    ),
    RecurringModule,
    DirectModule,
    PaymentModule,
  ],
})
export class AppModule {}
