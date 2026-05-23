import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RecurringModule } from './recurring/recurring.module';
import { DirectModule } from './direct/direct.module';
import { V3Module } from './v3/v3.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/myfatoorah_recurring',
    ),
    RecurringModule,
    DirectModule,
    V3Module,
    WebhookModule,
  ],
})
export class AppModule {}
