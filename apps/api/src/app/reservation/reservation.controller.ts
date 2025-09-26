import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { RejectReservationDto } from './dto/reject-reservation.dto';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Time slot already reserved' })
  createReservation(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationService.createReservation(createReservationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiResponse({ status: 200, description: 'Returns all reservations' })
  getAllReservations() {
    return this.reservationService.getAllReservations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single reservation by ID' })
  @ApiResponse({ status: 200, description: 'Returns the reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  getReservation(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.getReservation(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation updated successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  updateReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReservationDto: UpdateReservationDto
  ) {
    return this.reservationService.updateReservation(id, updateReservationDto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({
    status: 200,
    description: 'Reservation cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelReservationDto: CancelReservationDto
  ) {
    return this.reservationService.cancelReservation(id, cancelReservationDto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a reservation (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Reservation rejected successfully',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  // @UseGuards(AdminGuard) // Implement this guard for admin authentication
  rejectReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rejectReservationDto: RejectReservationDto
  ) {
    return this.reservationService.rejectReservation(id, rejectReservationDto);
  }
}
