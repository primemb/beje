import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectReservationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
