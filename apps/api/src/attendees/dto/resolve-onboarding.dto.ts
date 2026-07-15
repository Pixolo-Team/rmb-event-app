import { IsString, MinLength } from "class-validator";

export class ResolveOnboardingDto {
  @IsString()
  @MinLength(32)
  token!: string;
}
