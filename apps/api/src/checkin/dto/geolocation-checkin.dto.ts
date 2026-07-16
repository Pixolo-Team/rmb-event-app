import { IsLatitude, IsLongitude } from "class-validator";

export class GeolocationCheckinDto {
  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}
