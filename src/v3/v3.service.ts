import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import { V3Session, V3SessionDocument } from './schemas/v3-session.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { V3ChargeDto } from './dto/v3-charge.dto';

@Injectable()
export class V3Service {
  private readonly client: AxiosInstance;

  constructor(
    @InjectModel(V3Session.name)
    private readonly sessionModel: Model<V3SessionDocument>,
  ) {
    this.client = axios.create({
      baseURL: process.env.MYFATOORAH_BASE_URL || 'https://apitest.myfatoorah.com',
      headers: {
        Authorization: `Bearer ${process.env.MYFATOORAH_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createSession(dto: CreateSessionDto) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    const body = {
      PaymentMode: dto.paymentMode || 'COMPLETE_PAYMENT',
      Order: { Amount: dto.amount },
      SaveCardOptions: {
        SaveToken: true,
        ShowSavedCardsInCardView: true,
        RetrieveSavedTokens: true,
      },
      Customer: { Reference: dto.customerReference },
      IntegrationUrls: {
        Redirection: dto.redirectionUrl || `${backendUrl}/api/v3/callback`,
      },
    };

    try {
      const { data } = await this.client.post('/v3/sessions', body);

      await this.sessionModel.create({
        customerReference: dto.customerReference,
        sessionId: data?.Data?.SessionId,
        sessionExpiry: data?.Data?.SessionExpiry ? new Date(data.Data.SessionExpiry) : undefined,
        amount: dto.amount,
        currency: dto.currency || 'KWD',
        status: 'Pending',
        rawResponse: data,
      });

      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async getCustomerTokens(reference: string) {
    try {
      const { data } = await this.client.get(`/v3/customers/${encodeURIComponent(reference)}`);
      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async chargeWithToken(dto: V3ChargeDto) {
    const sourceOfFund = dto.token
      ? { Token: dto.token }
      : { SessionId: dto.sessionId };

    const body: Record<string, unknown> = {
      Order: { Amount: dto.amount },
      SourceOfFund: sourceOfFund,
      Language: dto.language || 'EN',
    };

    if (dto.token) {
      body.PaymentMethod = 'CARD';
    }

    if (dto.customerReference) {
      body.Customer = { Reference: dto.customerReference };
    }

    try {
      const { data } = await this.client.post('/v3/payments', body);
      return data;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async listSessions() {
    return this.sessionModel.find().sort({ createdAt: -1 }).exec();
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
