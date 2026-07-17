import { IsString, MaxLength, MinLength } from "class-validator";

export class AdminLoginDto {
  @IsString()
  @MaxLength(200)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
