import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  number!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type!: string; // "Suite Royale", "Double Vue Mer"

  @IsInt()
  @Min(1)
  floor!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerNight!: number;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  floor?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerNight?: number;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
