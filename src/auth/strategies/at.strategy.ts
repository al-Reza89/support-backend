import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../types';

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      // at.strategy.ts
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.access_token || null,
      ]),
      secretOrKey: config.get<string>('AT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
