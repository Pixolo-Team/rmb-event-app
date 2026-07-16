import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { INDUSTRIES, BUSINESS_CATEGORIES, LOOKING_FOR_TAGS, OFFERING_TAGS, GOALS_TAGS } from "../profile-options";

export class UpdateProfileDto {
  @IsIn(INDUSTRIES)
  industry!: string;

  @IsIn(BUSINESS_CATEGORIES)
  businessCategory!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(LOOKING_FOR_TAGS, { each: true })
  lookingFor!: string[];

  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(OFFERING_TAGS, { each: true })
  offering!: string[];

  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(GOALS_TAGS, { each: true })
  goals!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;
}
