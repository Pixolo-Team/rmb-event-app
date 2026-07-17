import { IsString, MaxLength } from "class-validator";

export class UpdateConnectionNoteDto {
  @IsString()
  @MaxLength(500)
  note!: string;
}
