import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { INDUSTRIES, LOOKING_FOR_TAGS, OFFERING_TAGS, GOALS_TAGS } from "../profile-options";

export class UpdateProfileDto {
  @IsIn(INDUSTRIES)
  industry!: string;

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
