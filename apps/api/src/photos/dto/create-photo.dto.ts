import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreatePhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}
