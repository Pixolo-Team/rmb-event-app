import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  ValidateNested,
} from "class-validator";

import {
  allowedImageContentTypes,
  AllowedImageContentTypeData,
  UploadCategories,
} from "../upload.types";

export class CreateUploadItemRequestData {
  @IsIn(allowedImageContentTypes)
  contentType!: AllowedImageContentTypeData;
}

export class CreateUploadUrlsRequestData {
  @IsEnum(UploadCategories)
  category!: UploadCategories;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateUploadItemRequestData)
  files!: CreateUploadItemRequestData[];
}
