import { IsString, MinLength } from "class-validator";

export class VerifyMagicLinkDto {
  @IsString()
  @MinLength(32)
  token!: string;
}
