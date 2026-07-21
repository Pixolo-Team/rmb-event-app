import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { GOALS_TAGS } from "../profile-options";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessCategory!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  lookingFor!: string[];

  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  offering!: string[];

  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(GOALS_TAGS, { each: true })
  goals!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  linkedInUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  websiteUrl?: string;
}
