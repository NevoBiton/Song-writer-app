import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class InviteFriendDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class SaveDraftDto {
  @IsArray()
  sections: unknown[];
}

export class ProposeDraftDto {
  @IsOptional()
  @IsString()
  note?: string;
}
