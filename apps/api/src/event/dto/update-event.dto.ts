import { IsBoolean, IsInt, IsISO8601, IsLatitude, IsLongitude, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

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
  @IsInt()
  @Min(100)
  @Max(5000)
  checkinRadiusM?: number;

  // "Clear location" (Screen 3.2A) — reverts to no venue configured, disabling
  // geolocation check-in until an admin sets coordinates again.
  @IsOptional()
  @IsBoolean()
  clearVenue?: boolean;
}
