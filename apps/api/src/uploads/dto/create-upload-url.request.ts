import { IsEnum, IsIn } from "class-validator";

export enum UploadCategories {
  Profile = "profile",
  Feed = "feed",
}

export class CreateUploadUrlRequestData {
  @IsEnum(UploadCategories)
  category!: UploadCategories;

  @IsIn(["image/jpeg", "image/png", "image/webp"])
  contentType!: "image/jpeg" | "image/png" | "image/webp";
}
