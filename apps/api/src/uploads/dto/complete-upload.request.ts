import { IsEnum, IsString, Matches } from "class-validator";

import { UploadCategories } from "../upload.types";

export class CompleteUploadRequestData {
  @IsEnum(UploadCategories)
  category!: UploadCategories;

  @IsString()
  @Matches(
    /^(profile|feed)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/,
  )
  objectPath!: string;
}
