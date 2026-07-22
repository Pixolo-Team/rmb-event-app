import { IsEnum, IsIn } from "class-validator";

import {
  allowedImageContentTypes,
  AllowedImageContentTypeData,
  UploadCategories,
} from "../upload.types";

export class CreateUploadUrlRequestData {
  @IsEnum(UploadCategories)
  category!: UploadCategories;

  @IsIn(allowedImageContentTypes)
  contentType!: AllowedImageContentTypeData;
}
