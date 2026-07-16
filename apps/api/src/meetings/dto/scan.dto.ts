import { IsNotEmpty, IsString } from "class-validator";

export class ScanDto {
  @IsString()
  @IsNotEmpty()
  qrToken!: string;
}
