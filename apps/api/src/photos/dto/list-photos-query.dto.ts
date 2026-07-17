import { IsInt, IsOptional, IsString, Max, Min, Type } from 'class-validator';

/** DTO for GET /photos (feed) query parameters */
export class ListPhotosQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
