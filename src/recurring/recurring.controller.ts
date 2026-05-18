import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecurringService } from './recurring.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ExecutePaymentDto } from './dto/execute-payment.dto';

@ApiBearerAuth()
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Payment Methods')
  @ApiOperation({
    summary: 'Get available payment methods',
    description:
      'Calls MyFatoorah InitiatePayment to retrieve all enabled payment methods and their service charges for the given amount and currency.',
  })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.recurringService.initiatePayment(dto);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Recurring')
  @ApiOperation({
    summary: 'Create a recurring payment',
    description:
      'Calls MyFatoorah ExecutePayment with a RecurringModel. Supports Daily, Weekly, Monthly, and Custom (interval days) recurring types. Returns an InvoiceURL for the customer to complete the first payment, which activates the recurring schedule.',
  })
  @ApiResponse({ status: 200, description: 'Payment executed — InvoiceURL returned' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  executePayment(@Body() dto: ExecutePaymentDto) {
    return this.recurringService.executePayment(dto);
  }

  @Get()
  @ApiTags('Recurring')
  @ApiOperation({
    summary: 'List all stored recurring records',
    description: 'Returns all recurring payment records saved in MongoDB.',
  })
  listAll() {
    return this.recurringService.listAllRecurrings();
  }

  @Get('callback')
  @ApiTags('Recurring')
  @ApiOperation({
    summary: 'Payment success callback',
    description: 'MyFatoorah redirects here after a successful payment.',
  })
  @ApiQuery({ name: 'paymentId', required: false })
  callback(@Query() query: Record<string, string>) {
    return { message: 'Payment callback received', data: query };
  }

  @Get('error')
  @ApiTags('Recurring')
  @ApiOperation({
    summary: 'Payment error callback',
    description: 'MyFatoorah redirects here after a failed payment.',
  })
  @ApiQuery({ name: 'paymentId', required: false })
  errorCallback(@Query() query: Record<string, string>) {
    return { message: 'Payment error callback received', data: query };
  }

  @Get(':recurringId')
  @ApiTags('Recurring')
  @ApiOperation({
    summary: 'Get recurring payment details',
    description:
      'Fetches the current status and execution history of a recurring payment from MyFatoorah.',
  })
  @ApiParam({ name: 'recurringId', description: 'The unique recurring ID' })
  @ApiResponse({ status: 200, description: 'Recurring payment details returned' })
  @ApiResponse({ status: 400, description: 'Not found or API error' })
  getRecurring(@Param('recurringId') recurringId: string) {
    return this.recurringService.getRecurring(recurringId);
  }

  @Post(':recurringId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Recurring')
  @ApiOperation({
    summary: 'Resume a recurring payment',
    description:
      'Retries a failed or paused recurring payment. The recurring must be in an inactive state.',
  })
  @ApiParam({ name: 'recurringId', description: 'The unique recurring ID to resume' })
  @ApiResponse({ status: 200, description: 'Recurring payment resumed successfully' })
  @ApiResponse({ status: 400, description: 'API error' })
  resumeRecurring(@Param('recurringId') recurringId: string) {
    return this.recurringService.resumeRecurring(recurringId);
  }

  @Delete(':recurringId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Recurring')
  @ApiOperation({
    summary: 'Cancel a recurring payment',
    description:
      'Permanently cancels an active recurring payment. No further charges will be made.',
  })
  @ApiParam({ name: 'recurringId', description: 'The unique recurring ID to cancel' })
  @ApiResponse({ status: 200, description: 'Recurring payment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'API error' })
  cancelRecurring(@Param('recurringId') recurringId: string) {
    return this.recurringService.cancelRecurring(recurringId);
  }
}
