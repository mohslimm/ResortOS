import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  roomId!: string;

  // Guest info (create or reuse by idCard)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  guestFullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  guestIdCard!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
