import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { AdminRole } from "@prisma/client";

export class CreateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  // Standard rule: lowercase letters and digits only, no spaces or symbols
  // (the UI derives this from the name by default, e.g. "Jyoti Pandey" -> "jyotipandey").
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+$/, { message: "Username must be lowercase letters and numbers only, no spaces" })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;
}
