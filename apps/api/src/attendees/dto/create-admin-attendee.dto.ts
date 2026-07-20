import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateAdminAttendeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;
}
