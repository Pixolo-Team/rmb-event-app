import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";

import { UploadCategories } from "../upload.types";

export class CompleteUploadItemRequestData {
  @IsString()
  @Matches(
    /^(profile|feed)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/,
  )
  objectPath!: string;
}

export class CompleteUploadsRequestData {
  @IsEnum(UploadCategories)
  category!: UploadCategories;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({
    each: true,
  })
  @Type(() => CompleteUploadItemRequestData)
  files!: CompleteUploadItemRequestData[];
}
