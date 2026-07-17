import { IsInt, IsOptional, IsString, Max, Min, Type } from 'class-validator';

/** DTO for GET /admin/feedback query parameters */
export class AdminFeedbackQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
