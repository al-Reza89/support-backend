import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_AUTH_CLIENT_ID'),
      clientSecret: config.get<string>('GOOGLE_AUTH_CLIENT_SECRET'),
      callbackURL: config.get<string>('GOOGLE_AUTH_CALLBACK_URL'),
      scope: ['email', 'profile'],
      state: true,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { name, emails, photos, provider } = profile;
      const locale = (profile._json as any)?.locale;

      const user = {
        email: emails[0].value,
        googleId: profile.id,
        firstName: name?.givenName,
        lastName: name?.familyName,
        displayName: profile.displayName,
        profileImage: photos?.[0]?.value,
        locale: locale,
        provider: provider,
      };
      console.log('user', user);

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
