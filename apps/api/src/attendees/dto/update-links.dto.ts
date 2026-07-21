import { IsOptional, IsUrl, MaxLength, ValidateIf } from "class-validator";

// Partial update for the profile's optional link fields (e.g. the /profile website
// editor), separate from the full onboarding profile update so it doesn't have to
// re-send — or re-validate — the required business/city/tag fields. Each field may
// be a valid URL or null (to clear it); omit a field to leave it unchanged.
export class UpdateLinksDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  linkedInUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  websiteUrl?: string | null;
}
