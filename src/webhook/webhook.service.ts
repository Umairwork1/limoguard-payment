import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { WebhookEvent, WebhookEventDocument } from './schemas/webhook-event.schema';
import { RecurringRecord, RecurringRecordDocument } from '../recurring/schemas/recurring-record.schema';
import { CustomerToken, CustomerTokenDocument } from '../direct/schemas/customer-token.schema';

const EVENT_CODES = {
  PAYMENT_STATUS_CHANGED: 1,
  REFUND_STATUS_CHANGED: 2,
  BALANCE_TRANSFERRED: 3,
  SUPPLIER_STATUS_CHANGED: 4,
  RECURRING_UPDATES: 5,
  DISPUTE_STATUS_CHANGED: 6,
  SUPPLIER_UPDATE_REQUEST_CHANGED: 7,
} as const;

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(WebhookEvent.name)
    private readonly eventModel: Model<WebhookEventDocument>,
    @InjectModel(RecurringRecord.name)
    private readonly recurringModel: Model<RecurringRecordDocument>,
    @InjectModel(CustomerToken.name)
    private readonly tokenModel: Model<CustomerTokenDocument>,
  ) {}

  verifySignature(payload: Record<string, unknown>, incomingSignature: string): boolean {
    const secret = process.env.Webhook_Secret_Key || process.env.MYFATOORAH_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('Webhook_Secret_Key not set — skipping signature verification');
      return true;
    }

    const eventCode = (payload as any)?.Event?.Code as number;
    const sigString = this.buildSignatureString(eventCode, payload);

    if (!sigString) {
      this.logger.warn(`No signature string defined for event code ${eventCode}`);
      return false;
    }

    const computed = crypto
      .createHmac('sha256', Buffer.from(secret, 'utf8'))
      .update(sigString, 'utf8')
      .digest('base64');

    const valid = computed === incomingSignature;
    if (!valid) {
      this.logger.warn(
        `Signature mismatch for event ${eventCode}. Expected=${computed} Got=${incomingSignature}`,
      );
    }
    return valid;
  }

  private buildSignatureString(
    eventCode: number,
    payload: Record<string, unknown>,
  ): string | null {
    const data = (payload as any)?.Data ?? {};
    const nil = (v: unknown) => (v === null || v === undefined ? '' : String(v));

    switch (eventCode) {
      case EVENT_CODES.PAYMENT_STATUS_CHANGED: {
        const invoice = data.Invoice ?? {};
        const transaction = data.Transaction ?? {};
        return [
          `Invoice.Id=${nil(invoice.Id)}`,
          `Invoice.Status=${nil(invoice.Status)}`,
          `Transaction.Status=${nil(transaction.Status)}`,
          `Transaction.PaymentId=${nil(transaction.PaymentId)}`,
          `Invoice.ExternalIdentifier=${nil(invoice.ExternalIdentifier)}`,
        ].join(',');
      }
      case EVENT_CODES.RECURRING_UPDATES: {
        const recurring = data.Recurring ?? {};
        return [
          `Recurring.Id=${nil(recurring.Id)}`,
          `Recurring.Status=${nil(recurring.Status)}`,
          `Recurring.InitialInvoiceId=${nil(recurring.InitialInvoiceId)}`,
        ].join(',');
      }
      default:
        return null;
    }
  }

  async handleEvent(
    payload: Record<string, unknown>,
    signatureStatus: string,
  ): Promise<{ message: string }> {
    const event = (payload as any)?.Event ?? {};
    const data = (payload as any)?.Data ?? {};
    const eventCode = event.Code as number;

    const saved = await this.eventModel.create({
      eventCode,
      eventName: event.Name ?? 'UNKNOWN',
      eventReference: event.Reference,
      countryIsoCode: event.CountryIsoCode,
      signatureStatus,
      payload,
      processingStatus: 'received',
    });

    try {
      switch (eventCode) {
        case EVENT_CODES.PAYMENT_STATUS_CHANGED:
          await this.handlePaymentStatusChanged(data);
          break;
        case EVENT_CODES.RECURRING_UPDATES:
          await this.handleRecurringUpdate(data);
          break;
        default:
          this.logger.log(`Received unhandled event code ${eventCode} (${event.Name})`);
          await this.eventModel.findByIdAndUpdate(saved._id, { processingStatus: 'ignored' });
          return { message: `Event ${event.Name} logged` };
      }

      await this.eventModel.findByIdAndUpdate(saved._id, { processingStatus: 'processed' });
      return { message: `Event ${event.Name} processed` };
    } catch (err) {
      this.logger.error(`Failed to process event ${eventCode}: ${err}`);
      return { message: 'Event logged but processing failed' };
    }
  }

  private async handlePaymentStatusChanged(data: Record<string, unknown>) {
    const invoice = (data as any)?.Invoice ?? {};
    const transaction = (data as any)?.Transaction ?? {};
    const invoiceId = String(invoice.Id ?? '');
    const invoiceStatus = invoice.Status ?? '';
    const cardToken = transaction?.Card?.Token;

    this.logger.log(`Payment status changed: invoiceId=${invoiceId} status=${invoiceStatus}`);

    // Activate the CustomerToken if a card token was returned
    if (invoiceId && cardToken) {
      const maskedCard = transaction?.Card?.Number ?? '';
      const paymentGateway = transaction?.PaymentMethod ?? '';
      await this.tokenModel.findOneAndUpdate(
        { invoiceId },
        {
          customerTokenId: cardToken,
          maskedCard,
          paymentGateway,
          status: 'Active',
        },
        { new: true },
      );
      this.logger.log(`CustomerToken activated for invoiceId=${invoiceId}, token=${cardToken}`);
    }

    // Update recurring record if invoiceId matches
    if (invoiceId) {
      await this.recurringModel.findOneAndUpdate(
        { invoiceId },
        { status: invoiceStatus === 'PAID' ? 'Active' : 'Draft' },
      );
    }
  }

  private async handleRecurringUpdate(data: Record<string, unknown>) {
    const recurring = (data as any)?.Recurring ?? {};
    const recurringId = String(recurring.Id ?? '');
    const status = recurring.Status ?? '';

    this.logger.log(`Recurring update: recurringId=${recurringId} status=${status}`);

    const statusMap: Record<string, string> = {
      ACTIVE: 'Active',
      UNCOMPLETED: 'Draft',
      COMPLETED: 'Completed',
    };

    if (recurringId) {
      await this.recurringModel.findOneAndUpdate(
        { recurringId },
        { status: statusMap[status] ?? status },
        { new: true },
      );
    }
  }

  async listEvents(limit = 50) {
    return this.eventModel.find().sort({ createdAt: -1 }).limit(limit).exec();
  }
}
