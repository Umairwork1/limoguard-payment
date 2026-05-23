import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { ChargeTokenDto } from './dto/charge-token.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('Payment (v3 Vendor Managed Recurring)')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── STEP 1 ────────────────────────────────────────────────────────────────

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 1 — Create payment session',
    description:
      'Calls POST /v3/sessions. Returns SessionId + EncryptionKey. ' +
      'Pass these to the MyFatoorah JS SDK to render the embedded card form. ' +
      'A Pending record is saved to DB.',
  })
  @ApiResponse({ status: 200, description: 'SessionId + EncryptionKey returned' })
  @ApiResponse({ status: 400, description: 'MyFatoorah API error' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.paymentService.createSession(dto);
  }

  // ── CALLBACK (auto — MyFatoorah calls this after payment) ─────────────────

  @Get('callback')
  @ApiOperation({
    summary: 'MyFatoorah redirect callback (auto)',
    description:
      'MyFatoorah redirects here after customer completes payment. ' +
      'Calls GET /v3/payments/{paymentId} to confirm payment, updates DB record status.',
  })
  @ApiQuery({ name: 'Id', required: false, description: 'PaymentId from MyFatoorah' })
  @ApiQuery({ name: 'ref', required: false, description: 'customerReference embedded in the redirect URL' })
  async callback(@Query() query: Record<string, string>, @Res() res: Response) {
    const paymentId = query.Id || query.paymentId;
    const customerReference = query.ref;
    try {
      await this.paymentService.handleCallback(paymentId, customerReference);
    } catch (err) {
      console.error('[payment/callback] failed:', err);
    }
    return res.redirect(
      `${process.env.FRONTEND_URL || 'https://limoguard-payments-frontend.vercel.app'}/payment-success.html?paymentId=${paymentId}`,
    );
  }

  @Get('error')
  @ApiOperation({ summary: 'MyFatoorah error callback (auto)' })
  errorCallback(@Res() res: Response) {
    return res.redirect(
      `${process.env.FRONTEND_URL || 'https://limoguard-payments-frontend.vercel.app'}/payment-error.html`,
    );
  }

  // ── STEP 2 ────────────────────────────────────────────────────────────────

  @Get('customers')
  @ApiOperation({
    summary: 'Step 2 — Get saved cards for a customer',
    description:
      'Calls GET /v3/customers?customerReference={reference}. ' +
      'Returns all saved cards with Token, Is3DSVerified, Brand. ' +
      'Saves the token to DB and sets status Active.',
  })
  @ApiQuery({ name: 'reference', required: true, description: 'Your customer reference' })
  @ApiResponse({ status: 200, description: 'Cards returned and token saved to DB' })
  getCustomerToken(@Query('reference') reference: string) {
    return this.paymentService.getCustomerToken(reference);
  }

  // ── STEP 3 ────────────────────────────────────────────────────────────────

  @Post('charge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 3 — Charge a saved token',
    description:
      'Calls POST /v3/payments with SourceOfFund.Token. ' +
      'Charges the customer silently — no redirect, no customer action needed. ' +
      'Merchant controls when and how much to charge.',
  })
  @ApiResponse({ status: 200, description: 'Charge successful, PaymentCompleted: true' })
  @ApiResponse({ status: 400, description: 'Charge failed' })
  @ApiResponse({ status: 404, description: 'Token not found or not Active' })
  chargeToken(@Body() dto: ChargeTokenDto) {
    return this.paymentService.chargeToken(dto);
  }

  // ── VERIFY ────────────────────────────────────────────────────────────────

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch and save card token for a customer',
    description:
      'Calls GET /v3/customers?Reference={reference}. ' +
      'Picks the first card, saves the TKN-xxx token to DB with status Active.',
  })
  @ApiResponse({ status: 200, description: 'Token saved, returns { success, token, card }' })
  @ApiResponse({ status: 400, description: 'No token found or MyFatoorah error' })
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentService.verify(dto);
  }

  // ── TOKEN MANAGEMENT ──────────────────────────────────────────────────────

  @Get('tokens')
  @ApiOperation({ summary: 'List all saved tokens' })
  @ApiResponse({ status: 200, description: 'Token list returned' })
  listTokens() {
    return this.paymentService.listTokens();
  }

  @Get('tokens/:id')
  @ApiOperation({ summary: 'Get one token by TKN-xxx' })
  @ApiParam({ name: 'id', description: 'The TKN-xxx token string' })
  @ApiResponse({ status: 200, description: 'Token found' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  getToken(@Param('id') id: string) {
    return this.paymentService.getToken(id);
  }

  @Delete('tokens/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a saved token' })
  @ApiParam({ name: 'id', description: 'The TKN-xxx token string' })
  @ApiResponse({ status: 200, description: 'Token cancelled' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  deleteToken(@Param('id') id: string) {
    return this.paymentService.deleteToken(id);
  }
}
