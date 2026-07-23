import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreatePhotoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(/^feed\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/, { each: true })
  objectPaths!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}
