import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenantName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug: uniquement des lettres minuscules, chiffres et tirets',
  })
  tenantSlug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminName!: string;

  @IsEmail({}, { message: 'Adresse email invalide' })
  adminEmail!: string;

  @IsString()
  @MinLength(8, { message: 'Mot de passe minimum 8 caractères' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  password!: string;
}
