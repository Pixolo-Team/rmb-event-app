import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { AgendaItemDto } from "./agenda-item.dto";

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsISO8601()
  startAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endAt?: string | null;

  @IsOptional()
  @IsLatitude()
  venueLat?: number;

  @IsOptional()
  @IsLongitude()
  venueLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  venueAddress?: string | null;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  checkinRadiusM?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  chairName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  chairTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  chairPhotoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  registrationUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  registrationPricing?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  agenda?: AgendaItemDto[];

  // "Clear location" (Screen 3.2A) — reverts to no venue configured, disabling
  // geolocation check-in until an admin sets coordinates again.
  @IsOptional()
  @IsBoolean()
  clearVenue?: boolean;
}
