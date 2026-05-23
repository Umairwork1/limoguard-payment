import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import { PaymentToken, PaymentTokenDocument } from './schemas/payment-token.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { ChargeTokenDto } from './dto/charge-token.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentService {
  private readonly client: AxiosInstance;

  constructor(
    @InjectModel(PaymentToken.name)
    private readonly tokenModel: Model<PaymentTokenDocument>,
  ) {
    this.client = axios.create({
      baseURL: process.env.MYFATOORAH_BASE_URL || 'https://apitest.myfatoorah.com',
      headers: {
        Authorization: `Bearer ${process.env.MYFATOORAH_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Create Session
  // POST /v3/sessions → returns SessionId + EncryptionKey for JS SDK
  // Saves a Pending record to DB so callback can find it later
  // ─────────────────────────────────────────────────────────────────────────

  async createSession(dto: CreateSessionDto) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';

    // Embed customerReference in callback URL so handleCallback can match the DB record
    const redirectUrl =
      dto.callBackUrl ||
      `${backendUrl}/api/payment/callback?ref=${encodeURIComponent(dto.customerReference)}`;

    const errorUrl =
      dto.errorUrl ||
      `${backendUrl}/api/payment/error`;

    const body = {
      Language: dto.language || 'EN',
      PaymentMode: dto.paymentMode || 'COMPLETE_PAYMENT',
      OperationType: dto.operationType || 'PAY',
      Order: {
        Amount: dto.invoiceValue,
        Currency: dto.currency || 'KWD',
      },
     SessionExpiry: "2026-05-23T14:30:00.000Z" ,
      SaveCardOptions: {
        SaveToken: true,
        ShowSavedCardsInCardView: true,
        RetrieveSavedTokens: true,
      },
      Customer: {
        Name: dto.customerName,
        Email: dto.customerEmail,
        Mobile: {
          CountryCode: dto.customerMobile.countryCode,
          Number: dto.customerMobile.number,
        },
        Reference: dto.customerReference,
      },
      ...(dto.supportedPaymentMethods?.length && {
        SupportedPaymentMethods: dto.supportedPaymentMethods,
      }),
      IntegrationUrls: {
        Redirection: redirectUrl,
        ErrorRedirection: errorUrl,
      },
    };

    try {
      const { data } = await this.client.post('/v3/sessions', body);

      const sessionId: string = data?.Data?.SessionId;
      const encryptionKey: string = data?.Data?.EncryptionKey;

      await this.tokenModel.create({
        sessionId,
        encryptionKey,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerMobile: `${dto.customerMobile.countryCode}${dto.customerMobile.number}`,
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

  // ─────────────────────────────────────────────────────────────────────────
  // CALLBACK — MyFatoorah redirects here after customer pays
  // GET /v3/payments/{paymentId} → extract invoice status → update DB record
  // ─────────────────────────────────────────────────────────────────────────

  async handleCallback(paymentId: string, customerReference?: string) {
    try {
      const { data } = await this.client.get(`/v3/payments/${paymentId}`);
      const pd = data?.Data;

      const invoiceId: string = pd?.InvoiceId?.toString() || '';
      const paymentCompleted: boolean = pd?.PaymentCompleted === true;

      const update: Record<string, unknown> = {
        paymentId,
        invoiceId,
        status: paymentCompleted ? 'Active' : 'Pending',
        rawResponse: data,
      };

      // Find record: Flow B (hosted-page) → by invoiceId | Flow A (session) → by customerReference
      let record = await this.tokenModel.findOneAndUpdate(
        { invoiceId },
        update,
        { returnDocument: 'after' },
      );

      if (!record && customerReference) {
        record = await this.tokenModel.findOneAndUpdate(
          { customerReference, status: 'Pending' },
          update,
          { returnDocument: 'after', sort: { createdAt: -1 } },
        );
      }

      return { message: 'Callback processed', paymentId, invoiceId, paymentCompleted };
    } catch (err) {
      this.handleApiError(err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Get Customer Token
  // GET /v3/customers?customerReference={reference}
  // Returns Cards[] with Token, then saves the token to DB
  // ─────────────────────────────────────────────────────────────────────────

  async getCustomerToken(reference: string) {
    try {

    const { data } = await this.client.get(`/v3/customers/${reference}`);
      console.log("test")
      const cards: Array<{
        Token: string;
        Number: string;
        Brand: string;
        Is3DSVerified: boolean;
      }> = data?.Data?.Cards || [];

      if (cards.length === 0) {
        return { message: 'No saved cards found for this customer', data };
      }

      // Prefer 3DS-verified card; fall back to first card
      const card = cards.find((c) => c.Is3DSVerified) ?? cards[0];

      // Save token to DB — find the most recent Active/Pending record for this customer
      await this.tokenModel.findOneAndUpdate(
        { customerReference: reference, status: { $in: ['Pending', 'Active'] } },
        {
          token: card.Token,
          maskedCard: card.Number,
          brand: card.Brand,
          is3DSVerified: card.Is3DSVerified,
          status: 'Active',
        },
        { returnDocument: 'after', sort: { createdAt: -1 } },
      );

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Charge Token
  // POST /v3/payments with SourceOfFund.Token (minimal body per docs)
  // ─────────────────────────────────────────────────────────────────────────

  async chargeToken(dto: ChargeTokenDto) {
    const record = await this.tokenModel.findOne({
      token: dto.token,
      status: 'Active',
    });

    if (!record) {
      throw new NotFoundException(`Active token ${dto.token} not found`);
    }

    const body = {
      PaymentMethod: 'CARD',
      Order: {
        Amount  : dto.invoiceValue,
        Currency: dto.currency || record.currencyIso || 'KWD',
        ...(dto.orderReference && { Reference: dto.orderReference }),
      },
      SourceOfFund: {
        Token: dto.token,
      },
      IntegrationUrls: {
        Redirection: `${process.env.BACKEND_URL}/api/payment/callback`,
      },
    };

    try {
      const { data } = await this.client.post('/v3/payments', body);

      console.log('Charge response:', JSON.stringify(data, null, 2));

      const chargeCompleted = data?.Data?.PaymentCompleted === true;
      const paymentId       = data?.Data?.PaymentId;
      const invoiceId       = data?.Data?.InvoiceId;
      const invoiceStatus   = data?.Data?.TransactionDetails?.Invoice?.Status;

      await this.tokenModel.findOneAndUpdate(
        { token: dto.token },
        { lastChargedAt: new Date() },
      );

      return {
        success  : chargeCompleted,
        paymentId,
        invoiceId,
        status   : invoiceStatus,
        amount   : dto.invoiceValue,
        currency : dto.currency || record.currencyIso,
      };
    } catch (err) {
      this.handleApiError(err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFY — Fetch token from MyFatoorah and save to DB
  // POST /api/payment/verify
  // GET /v3/customers?Reference={reference} → save first card token to DB
  // ─────────────────────────────────────────────────────────────────────────

  async verify(dto: VerifyPaymentDto) {
    try {
      const { data } = await this.client.get('/v3/customers', {
        params: { Reference: dto.reference },
      });

      console.log('Customer response:', data);

      const cards: Array<{
        Token: string;
        Number: string;
        Brand: string;
        Is3DSVerified: boolean;
      }> = data?.Data?.Cards || [];

      const card = cards[0];

      if (!card?.Token) {
        throw new BadRequestException('No token found — tokenization not enabled');
      }

      await this.tokenModel.create({
        token: card.Token,
        maskedCard: card.Number,
        brand: card.Brand,
        is3DSVerified: card.Is3DSVerified,
        customerReference: dto.reference,
        status: 'Active',
      });

      return {
        success: true,
        token: card.Token,
        card: card.Number,
      };
    } catch (err) {
      this.handleApiError(err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOKEN MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async listTokens() {
    return this.tokenModel
      .find({ status: { $nin: ['Cancelled'] } })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getToken(id: string) {
    const record = await this.tokenModel.findOne({
      token: id,
      status: { $ne: 'Cancelled' },
    });
    if (!record) throw new NotFoundException(`Token ${id} not found`);
    return record;
  }

  async deleteToken(id: string) {
    const record = await this.tokenModel.findOneAndUpdate(
      { token: id },
      { status: 'Cancelled' },
      { returnDocument: 'after' },
    );
    if (!record) throw new NotFoundException(`Token ${id} not found`);
    return { message: 'Token cancelled', token: id };
  }

  // ─────────────────────────────────────────────────────────────────────────

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
