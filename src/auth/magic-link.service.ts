import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import * as argon from 'argon2';
import { AuthDtoSignUp } from '../auth/dto';

@Injectable()
export class MagicLinkService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  //   async createMagicLink(email: string): Promise<void> {
  //     const token = this.jwtService.sign(
  //       { email },
  //       {
  //         secret: this.config.get<string>('SESSION_SECRET'),
  //         expiresIn: '10m',
  //       },
  //     );

  //     await this.emailService.sendMagicLink(email, token);
  //   }

  async createSignupLink(dto: AuthDtoSignUp): Promise<void> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ForbiddenException('Email already registered');
    }

    const token = this.jwtService.sign(
      {
        email: dto.email,
        password: dto.password,
        type: 'signup',
      },
      {
        secret: this.config.get<string>('SESSION_SECRET'),
        expiresIn: this.config.get<string>('MAGIC_LINK_EXPIRY'),
      },
    );

    try {
      await this.emailService.sendMagicLink(dto.email, token);
    } catch (error) {
      throw new ForbiddenException('Failed to send magic link');
    }
  }

  async verifyMagicLink(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('SESSION_SECRET'),
      });

      if (payload.type === 'signup') {
        const hash = await argon.hash(payload.password);
        const user = await this.prisma.user.create({
          data: {
            email: payload.email,
            hash,
            isGoogleAccount: false,
          },
        });
        return user;
      }

      // Handle regular magic link login
      const user = await this.prisma.user.upsert({
        where: { email: payload.email },
        update: {},
        create: {
          email: payload.email,
          isGoogleAccount: false,
        },
      });

      return user;
    } catch (error) {
      throw new Error('Invalid or expired magic link');
    }
  }
}
