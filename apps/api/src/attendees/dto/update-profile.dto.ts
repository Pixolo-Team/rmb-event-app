import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { GOALS_TAGS } from "../profile-options";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  lookingFor?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  offering?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(GOALS_TAGS, { each: true })
  goals?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  linkedInUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  websiteUrl?: string | null;
}
