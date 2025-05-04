import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Res,
  ForbiddenException,
  UnauthorizedException,
  Req,
  Query,
} from '@nestjs/common';
import { AuthDto, AuthDtoSignUp } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { Tokens } from './types';
import { Public, GetCurrentUser, GetCurrentUserId } from '../common/decorators';
import { RtGuard } from 'src/common/guards';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { setCookies, clearCookies } from './cookie.utils';
import { MagicLinkService } from './magic-link.service';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private magicLinkService: MagicLinkService,
  ) {}

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signinLocal(
    @Body() dto: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signin(dto);
    setCookies(res, tokens);
    return { message: 'Login successful' };
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signupLocal(@Body() dto: AuthDtoSignUp) {
    if (dto.password !== dto.confirmPassword) {
      throw new ForbiddenException(
        'Password and Confirm Password do not match',
      );
    }

    try {
      await this.magicLinkService.createSignupLink(dto);
      return {
        status: 'success',
        message: 'Signup successful. Please check your email for a magic link',
        data: {
          email: dto.email,
        },
      };
    } catch (error) {
      console.error('Signup error:', error);
      throw new ForbiddenException('Signup failed');
    }
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshlocal(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') rt: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Tokens> {
    const tokens = await this.authService.refresh(userId, rt);
    setCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetCurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<boolean> {
    try {
      clearCookies(res);
      return await this.authService.logout(userId);
    } catch (error) {
      console.error('Logout error:', error);
      throw new ForbiddenException('Logout failed');
    }
  }

  // http://localhost:3000/api/auth/google/init?redirect_url=http://localhost:3001/note
  @Public()
  @Get('google/init')
  initGoogleAuth(
    @Query('redirect_url') redirectUrl: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    req.session.redirectUrl = redirectUrl; // Store redirect URL in session
    res.redirect('/api/auth/google'); // Redirect to the Google auth route
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(@Query('redirect_url') redirectUrl?: string) {
    try {
      // If a redirect URL is provided, encode it in the state parameter
      if (redirectUrl) {
        const state = encodeURIComponent(redirectUrl);
        return { state };
      }
      return { msg: 'Google Authentication' };
    } catch (error) {
      throw new UnauthorizedException('Could not authenticate with Google');
    }
  }

  // http://localhost:3000/api/auth/user/redirect
  @Get('user/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      console.log('req.user', req.user);
      const tokens = await this.authService.googleAuth(req.user);
      setCookies(res, tokens);

      const redirectUrl =
        req.session.redirectUrl || `${process.env.FRONTEND_URL}/note`;
      delete req.session.redirectUrl;

      res.redirect(redirectUrl);
    } catch (error) {
      // Handle errors appropriately
      console.error('Google auth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/signin`);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async testServer(@GetCurrentUserId() userId: string) {
    return await this.authService.getUser(userId);
  }

  // @Public()
  // @Post('magic-link')
  // @HttpCode(HttpStatus.OK)
  // async sendMagicLink(@Body('email') email: string) {
  //   await this.magicLinkService.createMagicLink(email);
  //   return { message: 'Magic link sent to your email' };
  // }

  @Public()
  @Get('verify-magic-link')
  async verifyMagicLink(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.magicLinkService.verifyMagicLink(token);
      const tokens = await this.authService.getTokens(user.id, user.email);
      await this.authService.updateRtHash(user.id, tokens.refresh_token);
      setCookies(res, tokens);

      // Redirect to frontend after successful verification
      res.redirect(process.env.FRONTEND_URL || 'https://localhost:3001');
    } catch (error) {
      res.redirect(
        `${process.env.FRONTEND_URL}/error?message=Invalid or expired magic link`,
      );
    }
  }

  @Get('protected-route')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return { status: 'ok', message: 'Hello from protected route server' };
  }

  @Get('public-route')
  @Public()
  @HttpCode(HttpStatus.OK)
  async publicRoute() {
    return { status: 'ok', message: 'Hello from public route server' };
  }
}
