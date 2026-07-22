import { IsEnum, IsString, Matches } from "class-validator";

import { UploadCategories } from "./create-upload-url.request";

export class CompleteUploadRequestData {
  @IsEnum(UploadCategories)
  category!: UploadCategories;

  @IsString()
  @Matches(/^[a-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i)
  objectPath!: string;
}
