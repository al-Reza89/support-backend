import { Response } from 'express';
import { Tokens } from './types';

export function setCookies(res: Response, tokens: Tokens) {
  res.cookie('access_token', tokens.access_token, {
    httpOnly: true,
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Number(process.env.ACCESS_TOKEN_AGE), // 15 minutes
  });

  res.cookie('refresh_token', tokens.refresh_token, {
    httpOnly: true,
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Number(process.env.REFRESH_TOKEN_AGE), // 7 days
  });
}

export function clearCookies(res: Response) {
  res.clearCookie('access_token', {
    httpOnly: true,
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}
