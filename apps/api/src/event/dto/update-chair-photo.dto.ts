import { IsString, Matches } from "class-validator";

export class UpdateChairPhotoDto {
  @IsString()
  @Matches(/^profile\/admin\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/)
  objectPath!: string;
}
