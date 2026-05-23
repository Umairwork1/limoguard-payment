import { Controller, Post, Get, Body, Param, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { V3Service } from './v3.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { V3ChargeDto } from './dto/v3-charge.dto';

@ApiBearerAuth()
@ApiTags('V3 — Vendor-Managed Recurring')
@Controller('v3')
export class V3Controller {
  constructor(private readonly v3Service: V3Service) {}

  @Post('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a payment session (step 1)',
    description:
      'Calls POST /v3/sessions with SaveToken: true. Returns a SessionId and EncryptionKey. ' +
      'Use the SessionId with the MyFatoorah embedded JS SDK to render the card form. ' +
      'After the customer completes payment, their card is saved as a reusable token.',
  })
  @ApiResponse({ status: 200, description: 'Session created — SessionId and EncryptionKey returned' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.v3Service.createSession(dto);
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'List all stored v3 sessions',
    description: 'Returns all v3 session records saved in MongoDB.',
  })
  listSessions() {
    return this.v3Service.listSessions();
  }

  @Get('callback')
  @ApiOperation({
    summary: 'V3 payment callback',
    description: 'MyFatoorah redirects here after the customer completes the session payment.',
  })
  @ApiQuery({ name: 'paymentId', required: false })
  callback(@Query() query: Record<string, string>, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}?v3callback=1&paymentId=${query.paymentId || ''}`);
  }

  @Get('customers/:reference')
  @ApiOperation({
    summary: 'Get customer saved tokens (step 2)',
    description:
      'Calls GET /v3/customers/{Reference} to retrieve all saved card tokens for a customer. ' +
      'Use the returned Token value with POST /api/v3/payments to charge the customer.',
  })
  @ApiParam({ name: 'reference', description: 'The customer reference used when creating the session' })
  @ApiResponse({ status: 200, description: 'Customer tokens returned' })
  @ApiResponse({ status: 400, description: 'Customer not found or API error' })
  getCustomerTokens(@Param('reference') reference: string) {
    return this.v3Service.getCustomerTokens(reference);
  }

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Charge a saved token (step 3)',
    description:
      'Calls POST /v3/payments with the saved token. ' +
      'Charges the customer directly without any redirect — server-side only. ' +
      'Requires FastPay or Bypass3DS to be enabled on the account for cards not yet 3DS-verified.',
  })
  @ApiResponse({ status: 200, description: 'Payment successful' })
  @ApiResponse({ status: 400, description: 'Payment failed or API error' })
  chargeWithToken(@Body() dto: V3ChargeDto) {
    return this.v3Service.chargeWithToken(dto);
  }
}
