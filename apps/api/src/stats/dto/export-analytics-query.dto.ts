import { IsIn, IsOptional } from 'class-validator';

/** DTO for GET /admin/analytics/export query parameters */
export class ExportAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: 'csv' | 'pdf';
}
