import { IsUUID } from "class-validator";

export class ToggleBookmarkDto {
  @IsUUID()
  attendeeId!: string;
}
