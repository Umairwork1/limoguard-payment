import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import { RecurringRecord, RecurringRecordDocument } from './schemas/recurring-record.schema';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ExecutePaymentDto } from './dto/execute-payment.dto';

@Injectable()
export class RecurringService {
  private readonly client: AxiosInstance;

  constructor(
    @InjectModel(RecurringRecord.name)
    private readonly recurringModel: Model<RecurringRecordDocument>,
  ) {
    this.client = axios.create({
      baseURL: process.env.MYFATOORAH_BASE_URL || 'https://apitest.myfatoorah.com',
      headers: {
        Authorization: `Bearer ${process.env.MYFATOORAH_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initiatePayment(dto: InitiatePaymentDto) {
    try {
      const { data } = await this.client.post('/v2/InitiatePayment', {
        InvoiceAmount: dto.invoiceAmount,
        CurrencyIso: dto.currencyIso,
      });
      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async executePayment(dto: ExecutePaymentDto) {
    const body: Record<string, unknown> = {
      PaymentMethodId: dto.paymentMethodId,
      InvoiceValue: dto.invoiceValue,
      CustomerName: dto.customerName,
      CustomerEmail: dto.customerEmail,
      CustomerMobile: dto.customerMobile,
      DisplayCurrencyIso: dto.displayCurrencyIso || 'KWD',
      Language: dto.language || 'en',
      CallBackUrl:
        dto.callBackUrl ||
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/recurring/callback`,
      ErrorUrl:
        dto.errorUrl ||
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/recurring/error`,
      RecurringModel: {
        RecurringType: dto.recurringModel.recurringType,
        Iteration: dto.recurringModel.iteration,
        RetryCount: dto.recurringModel.retryCount ?? 0,
        ...(dto.recurringModel.intervalDays !== undefined && {
          IntervalDays: dto.recurringModel.intervalDays,
        }),
      },
    };

    if (dto.customerReference) {
      body.CustomerReference = dto.customerReference;
    }

    try {
      const { data } = await this.client.post('/v2/ExecutePayment', body);

      const invoiceId = data?.Data?.InvoiceId?.toString() || '';
      const invoiceUrl = data?.Data?.InvoiceURL || '';
      const recurringId =
        data?.Data?.RecurringId?.toString() ||
        data?.Data?.InvoiceId?.toString() ||
        `tmp-${Date.now()}`;

      await this.recurringModel.create({
        recurringId,
        invoiceId,
        invoiceUrl,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerMobile: dto.customerMobile,
        amount: dto.invoiceValue,
        currencyIso: dto.displayCurrencyIso || 'KWD',
        recurringType: dto.recurringModel.recurringType,
        intervalDays: dto.recurringModel.intervalDays,
        iteration: dto.recurringModel.iteration,
        retryCount: dto.recurringModel.retryCount ?? 0,
        status: 'Draft',
        rawResponse: data,
      });

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async getRecurring(recurringId: string) {
    try {
      const { data } = await this.client.get('/v2/GetRecurringPayment', {
        params: { recurringId },
      });

      await this.recurringModel.findOneAndUpdate(
        { recurringId },
        { status: data?.Data?.RecurringStatus || 'Unknown', rawResponse: data },
        { new: true },
      );

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async resumeRecurring(recurringId: string) {
    try {
      const { data } = await this.client.post('/v2/ResumeRecurringPayment', null, {
        params: { recurringId },
      });

      await this.recurringModel.findOneAndUpdate(
        { recurringId },
        { status: 'Active' },
        { new: true },
      );

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async cancelRecurring(recurringId: string) {
    try {
      const { data } = await this.client.post('/v2/CancelRecurringPayment', null, {
        params: { recurringId },
      });

      await this.recurringModel.findOneAndUpdate(
        { recurringId },
        { status: 'Cancelled' },
        { new: true },
      );

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async listAllRecurrings() {
    return this.recurringModel.find().sort({ createdAt: -1 }).exec();
  }

  private handleApiError(err: unknown): never {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.ValidationErrors?.[0]?.Error ||
        err.response?.data?.Message ||
        err.message;
      throw new BadRequestException(message);
    }
    throw err;
  }
}
