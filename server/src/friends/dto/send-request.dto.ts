import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
