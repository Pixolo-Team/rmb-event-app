import { IsNotEmpty, IsString } from "class-validator";

export class QrScanCheckinDto {
  @IsString()
  @IsNotEmpty()
  qrToken!: string;
}
