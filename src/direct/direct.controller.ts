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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DirectService } from './direct.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { DirectChargeDto } from './dto/direct-charge.dto';
import { InitiatePaymentDto } from '../recurring/dto/initiate-payment.dto';

@ApiBearerAuth()
@ApiTags('Direct (v3)')
@Controller('direct')
export class DirectController {
  constructor(private readonly directService: DirectService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get available payment methods',
    description: 'Calls MyFatoorah InitiatePayment to retrieve enabled payment methods and charges for the given amount and currency.',
  })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.directService.initiatePayment(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register a customer card token (first payment)',
    description:
      'Calls MyFatoorah ExecutePayment with SaveToken: true. Customer completes the payment on the returned InvoiceURL, after which their card is saved as a reusable token. The callback at /api/direct/callback activates the token.',
  })
  @ApiResponse({ status: 200, description: 'InvoiceURL returned — redirect customer to complete payment and save card' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  registerToken(@Body() dto: RegisterTokenDto) {
    return this.directService.registerToken(dto);
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Token registration callback',
    description:
      'MyFatoorah redirects here after the customer completes the registration payment. Activates the token in the database then redirects the customer to the frontend success page.',
  })
  @ApiQuery({ name: 'Id', required: true, description: 'Payment ID sent by MyFatoorah' })
  async callback(@Query() query: Record<string, string>, @Res() res: Response) {
    const paymentId = query.Id || query.paymentId;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await this.directService.handleCallback(paymentId);
    return res.redirect(`${frontendUrl}/payment-success.html?invoiceId=${query.Id}`);
  }

  @Get('error')
  @ApiOperation({
    summary: 'Token registration error callback',
    description: 'MyFatoorah redirects here when card registration fails. Redirects customer to the frontend error page.',
  })
  @ApiQuery({ name: 'Id', required: false })
  errorCallback(@Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment-error.html`);
  }

  @Get('tokens')
  @ApiOperation({
    summary: 'List all saved customer tokens',
    description: 'Returns all active and pending customer card tokens stored in the database.',
  })
  @ApiResponse({ status: 200, description: 'Token list returned' })
  listTokens() {
    return this.directService.listTokens();
  }

  @Get('tokens/:tokenId')
  @ApiOperation({
    summary: 'Get a single customer token',
    description: 'Returns the details of a specific saved card token by its CustomerTokenId.',
  })
  @ApiParam({ name: 'tokenId', description: 'The CustomerTokenId from MyFatoorah' })
  @ApiResponse({ status: 200, description: 'Token found' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  getToken(@Param('tokenId') tokenId: string) {
    return this.directService.getToken(tokenId);
  }

  @Post('tokens/:tokenId/charge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Charge a saved customer token',
    description:
      'Calls MyFatoorah DirectPayment with the saved CustomerTokenId. Charges the customer immediately without redirecting to a payment page. The merchant controls when and how much to charge.',
  })
  @ApiParam({ name: 'tokenId', description: 'The CustomerTokenId to charge' })
  @ApiResponse({ status: 200, description: 'Charge successful' })
  @ApiResponse({ status: 400, description: 'Charge failed or API error' })
  @ApiResponse({ status: 404, description: 'Token not found or not active' })
  directCharge(@Param('tokenId') tokenId: string, @Body() dto: DirectChargeDto) {
    return this.directService.directCharge(tokenId, dto);
  }

  @Delete('tokens/:tokenId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a saved customer token',
    description: 'Marks the token as deleted in the database. It can no longer be used for charges.',
  })
  @ApiParam({ name: 'tokenId', description: 'The CustomerTokenId to delete' })
  @ApiResponse({ status: 200, description: 'Token deleted' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  deleteToken(@Param('tokenId') tokenId: string) {
    return this.directService.deleteToken(tokenId);
  }
}
