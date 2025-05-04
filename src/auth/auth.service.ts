import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto, AuthDtoSignUp } from './dto/auth.dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Tokens } from './types/tokens.type';
import { JwtPayload } from './types';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface GoogleUser {
  email: string;
  googleId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImage?: string;
  locale?: string;
  provider?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}
  async signup(dto: AuthDtoSignUp): Promise<Tokens> {
    // check password is exctly match with confirmPassword

    if (dto.password !== dto.confirmPassword) {
      throw new ForbiddenException(
        'Password and Confirm Password do not match',
      );
    }

    const hash = await argon.hash(dto.password);
    const user = await this.prisma.user
      .create({
        data: {
          email: dto.email,
          hash,
        },
      })
      .catch((err) => {
        if (err instanceof PrismaClientKnownRequestError) {
          if (err.code === 'P2002') {
            throw new ForbiddenException('Creditials incorrect');
          }
        }
        throw err;
      });

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }
  async signin(dto: AuthDto): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Access Denied');
    }

    console.log('sign in hello');

    const passwordMatches = await argon.verify(user.hash, dto.password);

    if (!passwordMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: string): Promise<boolean> {
    await this.prisma.user.update({
      where: {
        id: userId,
        hashedRt: { not: null }, // Ensure we only log out logged-in users
      },
      data: { hashedRt: null },
    });

    return true;
  }

  async refresh(userId: string, rt: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.hashedRt) {
      throw new ForbiddenException('Access Denied');
    }

    const rMatches = await argon.verify(user.hashedRt, rt);
    if (!rMatches)
      throw new ForbiddenException('Access Denied hash doesnt match');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async updateRtHash(userId: string, rt: string): Promise<void> {
    const hash = await argon.hash(rt);
    console.log('hash', hash);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt: hash,
      },
    });
  }

  async getTokens(userId: string, email: string): Promise<Tokens> {
    const jwtPayload: JwtPayload = {
      sub: userId,
      email: email,
    };

    const accessTokenAgeSec =
      this.config.get<number>('ACCESS_TOKEN_AGE') / 1000;
    const refreshTokenAgeSec =
      this.config.get<number>('REFRESH_TOKEN_AGE') / 1000;

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('AT_SECRET'),
        expiresIn: `${accessTokenAgeSec}s`,
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('RT_SECRET'),
        expiresIn: `${refreshTokenAgeSec}s`,
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  async googleAuth(userData: GoogleUser): Promise<Tokens> {
    let dbUser = await this.prisma.user.findUnique({
      where: {
        email: userData.email,
      },
    });

    if (!dbUser) {
      // Create new user if doesn't exist
      dbUser = await this.prisma.user.create({
        data: {
          email: userData.email,
          googleId: userData.googleId,
          isGoogleAccount: true,
          hash: null,
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          profileImage: userData.profileImage,
          locale: userData.locale,
          provider: userData.provider,
        },
      });
    } else {
      // Update existing user's profile information
      dbUser = await this.prisma.user.update({
        where: { id: dbUser.id },
        data: {
          googleId: userData.googleId,
          isGoogleAccount: true,
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          profileImage: userData.profileImage,
          locale: userData.locale,
          provider: userData.provider,
        },
      });
    }

    console.log('dbUser', dbUser);
    console.log('dbUser.id', dbUser.id);

    const tokens = await this.getTokens(dbUser.id, dbUser.email);
    // this function update the refresh token hash in the database and return nothing
    await this.updateRtHash(dbUser.id, tokens.refresh_token);

    console.log('tokens', tokens);
    console.log('tokens.access_token', tokens.access_token);
    console.log('tokens.refresh_token', tokens.refresh_token);

    return tokens;
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    return {
      message: 'User found',
      data: {
        id: user.id,
        name: user.firstName,
        role: user.role,
        email: user.email,
      },
    };

    if (!user) {
      throw new ForbiddenException('Access Denied');
    }

    return user;
  }
}
