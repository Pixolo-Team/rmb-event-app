import { IsString, Matches } from "class-validator";

export class CreateDownloadUrlRequestData {
  @IsString()
  @Matches(/^[a-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i)
  objectPath!: string;
}
