import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import { CustomerToken, CustomerTokenDocument } from './schemas/customer-token.schema';
import { RegisterTokenDto } from './dto/register-token.dto';
import { DirectChargeDto } from './dto/direct-charge.dto';
import { InitiatePaymentDto } from '../recurring/dto/initiate-payment.dto';

@Injectable()
export class DirectService {
  private readonly client: AxiosInstance;

  constructor(
    @InjectModel(CustomerToken.name)
    private readonly tokenModel: Model<CustomerTokenDocument>,
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

  async registerToken(dto: RegisterTokenDto) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    const body = {
      PaymentMethodId: dto.paymentMethodId,
      InvoiceValue: dto.invoiceValue,
      CustomerName: dto.customerName,
      CustomerEmail: dto.customerEmail,
      CustomerMobile: dto.customerMobile,
      DisplayCurrencyIso: dto.displayCurrencyIso || 'KWD',
      Language: dto.language || 'en',
      SaveToken: true,
      CallBackUrl: dto.callBackUrl || `${backendUrl}/api/direct/callback`,
      ErrorUrl: dto.errorUrl || `${backendUrl}/api/direct/error`,
      ...(dto.customerReference && { CustomerReference: dto.customerReference }),
    };

    try {
      const { data } = await this.client.post('/v2/ExecutePayment', body);

      const invoiceId = data?.Data?.InvoiceId?.toString() || `tmp-${Date.now()}`;
      const invoiceUrl = data?.Data?.InvoiceURL || '';

      await this.tokenModel.create({
        invoiceId,
        invoiceUrl,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerMobile: dto.customerMobile,
        customerReference: dto.customerReference,
        currencyIso: dto.displayCurrencyIso || 'KWD',
        status: 'Pending',
        rawResponse: data,
      });

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async handleCallback(paymentId: string) {
    try {
      const { data } = await this.client.post('/v2/GetPaymentStatus', {
        Key: paymentId,
        KeyType: 'paymentId',
      });

      const invoiceData = data?.Data;
      const invoiceId = invoiceData?.InvoiceId?.toString();
      const transaction = invoiceData?.InvoiceTransactions?.[0];

      const customerTokenId = transaction?.Card?.Token || undefined;
      const paymentGateway = transaction?.PaymentGateway || '';
      const maskedCard = transaction?.Card?.Number || transaction?.CardNumber || '';

      if (invoiceId) {
        await this.tokenModel.findOneAndUpdate(
          { invoiceId },
          {
            customerTokenId,
            paymentGateway,
            maskedCard,
            status: customerTokenId ? 'Active' : 'Pending',
            rawResponse: data,
          },
          { new: true },
        );
      }

      return { message: 'Token registered successfully', customerTokenId, invoiceId };
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async listTokens() {
    return this.tokenModel.find({ status: { $ne: 'Deleted' } }).sort({ createdAt: -1 }).exec();
  }

  async getToken(tokenId: string) {
    const token = await this.tokenModel.findOne({
      customerTokenId: tokenId,
      status: { $ne: 'Deleted' },
    });
    if (!token) throw new NotFoundException(`Token ${tokenId} not found`);
    return token;
  }

  async directCharge(tokenId: string, dto: DirectChargeDto) {
    const token = await this.tokenModel.findOne({
      customerTokenId: tokenId,
      status: 'Active',
    });
    if (!token) throw new NotFoundException(`Active token ${tokenId} not found`);

    const body = {
      CustomerTokenId: tokenId,
      InvoiceValue: dto.invoiceValue,
      DisplayCurrencyIso: dto.displayCurrencyIso || token.currencyIso || 'KWD',
      Language: dto.language || 'en',
      ...(dto.customerReference && { CustomerReference: dto.customerReference }),
    };

    try {
      const { data } = await this.client.post('/v2/DirectPayment', body);
      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async deleteToken(tokenId: string) {
    const token = await this.tokenModel.findOneAndUpdate(
      { customerTokenId: tokenId },
      { status: 'Deleted' },
      { new: true },
    );
    if (!token) throw new NotFoundException(`Token ${tokenId} not found`);
    return { message: 'Token deleted successfully', tokenId };
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
