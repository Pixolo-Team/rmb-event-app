import { IsNotEmpty, IsString } from "class-validator";

export class ScanConnectionDto {
  @IsString()
  @IsNotEmpty()
  qrToken!: string;
}
