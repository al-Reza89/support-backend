import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtPayload, JwtPayloadWithRt } from '../types';
import { Request } from 'express';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies.refresh_token,
      ]),
      secretOrKey: config.get<string>('RT_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtPayloadWithRt {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) throw new ForbiddenException('Refresh token malformed');
    return { ...payload, refreshToken };
  }
}
