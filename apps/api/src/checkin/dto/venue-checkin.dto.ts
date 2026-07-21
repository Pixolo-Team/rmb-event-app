import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class VenueCheckinDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;
}
