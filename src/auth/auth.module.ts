import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AtStrategy, RtStrategy } from './strategies';
import { GoogleStrategy } from './strategies/google.strategy';
import { EmailService } from './email.service';
import { MagicLinkService } from './magic-link.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AtStrategy,
    RtStrategy,
    GoogleStrategy,
    EmailService,
    MagicLinkService,
  ],
})
export class AuthModule {}
