import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus, ForbiddenException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive MyFatoorah webhook events',
    description:
      'Single endpoint for all MyFatoorah V2 webhook events. ' +
      'Verifies the HMAC-SHA256 signature in the `myfatoorah-signature` header using your webhook secret key. ' +
      'Rejects any request with an invalid signature with 403. ' +
      'Register this URL in your MyFatoorah portal under Integration Settings → Webhook Settings.',
  })
  @ApiHeader({
    name: 'myfatoorah-signature',
    description: 'HMAC-SHA256 signature computed by MyFatoorah using your webhook secret key',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Event received and processed' })
  @ApiResponse({ status: 403, description: 'Invalid or missing signature' })
  async receiveWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('myfatoorah-signature') signature: string,
  ) {
    if (!signature) {
      throw new ForbiddenException('Missing myfatoorah-signature header');
    }

    const valid = this.webhookService.verifySignature(payload, signature);
    if (!valid) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    return this.webhookService.handleEvent(payload, 'verified');
  }

  @Get('events')
  @ApiOperation({
    summary: 'List received webhook events',
    description: 'Returns the most recent webhook events received and logged in MongoDB.',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records to return (default 50)' })
  listEvents(@Query('limit') limit?: string) {
    return this.webhookService.listEvents(limit ? Number(limit) : 50);
  }
}
