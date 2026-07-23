import { IsString, Matches } from "class-validator";

export class AssignPhotoDto {
  @IsString()
  @Matches(/^profile\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/)
  objectPath!: string;
}
