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

  // v2 — still used to get available payment methods
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

  // Step 1 — POST /v3/payments with SaveToken: true
  async registerToken(dto: RegisterTokenDto) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
console.log("kk")
    const body = {
      Language: dto.language || 'EN',
      PaymentMethod: 'CARD',
      Order: {
        Amount: dto.invoiceValue,
        Currency: dto.currency || 'KWD',
      },
      SaveCardOptions: {
        SaveToken: true,
      },
      Customer: {
        Name: dto.customerName,
        Email: dto.customerEmail,
        Mobile: {
          CountryCode: dto.customerMobileCountryCode,
          Number: dto.customerMobileNumber,
        },
        Reference: dto.customerReference,
      },
      IntegrationUrls: {
        Redirection: dto.callBackUrl || `${backendUrl}/api/direct/callback`,
        ErrorRedirection: dto.errorUrl || `${backendUrl}/api/direct/error`,
      },
    };
    try {
      const { data } = await this.client.post('/v3/payments', body);
      
    console.log(data,"data><")
      // v3 returns PaymentId + PaymentURL
      const paymentId =
        data?.Data?.PaymentId?.toString() ||
        data?.Data?.InvoiceId?.toString() ||
        `tmp-${Date.now()}`;

      const paymentUrl =
        data?.Data?.PaymentURL ||
        data?.Data?.InvoiceURL ||
        '';

      await this.tokenModel.create({
        paymentId,
        paymentUrl,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerMobile: `${dto.customerMobileCountryCode}${dto.customerMobileNumber}`,
        customerReference: dto.customerReference,
        currencyIso: dto.currency || 'KWD',
        status: 'Pending',
        rawResponse: data,
      });

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  // Step 2 — GET /v3/payments/{paymentId} — called from callback
  async handleCallback(paymentId: string) {
    try {
      const { data } = await this.client.get(`/v3/payments/${paymentId}`);

      const invoiceData = data?.Data;
     console.log(invoiceData,"invoicedata<<")
      // v3 token: Card.Token is the primary path; fall back to SourceOfFund.Token
      const customerTokenId =
        invoiceData?.Card?.Token ||
        invoiceData?.SourceOfFund?.Token ||
        invoiceData?.CustomerTokenId ||
        undefined;

      const paymentGateway =
        invoiceData?.SourceOfFund?.Type ||
        invoiceData?.InvoiceTransactions?.[0]?.PaymentGateway ||
        '';

      const maskedCard =
        invoiceData?.Card?.Number ||
        invoiceData?.SourceOfFund?.Card?.Number ||
        invoiceData?.InvoiceTransactions?.[0]?.Card?.Number ||
        '';

      // Match by the paymentId from the callback query param
      await this.tokenModel.findOneAndUpdate(
        { paymentId },
        {
          customerTokenId: customerTokenId || undefined,
          paymentGateway,
          maskedCard,
          status: customerTokenId ? 'Active' : 'Pending',
          rawResponse: data,
        },
        { returnDocument: 'after' },
      );

      return { message: 'Callback processed', customerTokenId, paymentId };
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

  // Step 3 — POST /v3/payments with SourceOfFund.Token
  async directCharge(tokenId: string, dto: DirectChargeDto) {
    const token = await this.tokenModel.findOne({
      customerTokenId: tokenId,
      status: 'Active',
    });
    if (!token) throw new NotFoundException(`Active token ${tokenId} not found`);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    const body = {
      Language: dto.language || 'EN',
      PaymentMethod: 'CARD',
      Order: {
        Amount: dto.invoiceValue,
        Currency: dto.currency || token.currencyIso || 'KWD',
        ...(dto.orderReference && { Reference: dto.orderReference }),
      },
      SourceOfFund: {
        Token: tokenId,
      },
      Customer: {
        Reference: token.customerReference,
      },
      IntegrationUrls: {
        Redirection: `${backendUrl}/api/direct/callback`,
      },
    };

    try {
      const { data } = await this.client.post('/v3/payments', body);
      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async deleteToken(tokenId: string) {
    const token = await this.tokenModel.findOneAndUpdate(
      { customerTokenId: tokenId },
      { status: 'Deleted' },
      { returnDocument: 'after' },
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
