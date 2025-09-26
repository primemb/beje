import {
  IsString,
  IsEmail,
  IsBoolean,
  Matches,
  IsPhoneNumber,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({
    description: 'The time which call begins in HH:mm format',
    example: '13:15',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):(00|15|30|45)$/, {
    message:
      'Start time must be in HH:mm format with minutes as 00, 15, 30, or 45',
  })
  startTime: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pushNotificationKey: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  receiveEmail: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  receiveSmsNotification: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  receivePushNotification: boolean;
}
