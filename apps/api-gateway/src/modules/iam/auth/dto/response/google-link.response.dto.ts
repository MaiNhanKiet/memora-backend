import { ApiPropertyOptional } from '@nestjs/swagger';
import { PublicUserResponseDto } from './public-user.response.dto';

export class GoogleLinkResponseDto {
  @ApiPropertyOptional({
    description:
      'Returned when the body contains password. Open this URL in the browser.',
    example: 'https://accounts.google.com/o/oauth2/v2/auth?state=example',
  })
  authorizationUrl?: string;

  @ApiPropertyOptional({
    type: PublicUserResponseDto,
    description:
      'Returned when the body contains confirmationId and linking has completed.',
  })
  user?: PublicUserResponseDto;
}
