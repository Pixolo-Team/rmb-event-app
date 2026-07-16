import { IsBoolean, IsInt, IsLatitude, IsLongitude, IsOptional, Max, Min } from "class-validator";

export class UpdateEventDto {
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
