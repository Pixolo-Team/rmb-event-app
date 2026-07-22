import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

// 24-hour "HH:MM" as produced by <input type="time">.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AgendaItemDto {
  @Matches(TIME_PATTERN, { message: "startTime must be HH:MM" })
  startTime!: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: "endTime must be HH:MM" })
  endTime?: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
