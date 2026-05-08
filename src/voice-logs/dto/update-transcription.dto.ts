import { IsString, MinLength } from 'class-validator';

export class UpdateTranscriptionDto {
  @IsString()
  @MinLength(1)
  transcription!: string;
}
