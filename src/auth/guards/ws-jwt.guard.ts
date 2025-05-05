import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractTokenFromHeader(client);

      if (!token) {
        throw new WsException('Unauthorized - No token provided');
      }

      // Get JWT secret with fallback
      const secret =
        this.configService.get<string>('AT_SECRET') ||
        'fallback_secret_for_development';

      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Attach the user payload to the socket client
      client['user'] = payload;

      return true;
    } catch (error) {
      throw new WsException('Unauthorized - Invalid token');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // First try to get token from handshake auth
    const handshakeAuth = client.handshake?.auth?.token;
    if (handshakeAuth) return handshakeAuth;

    // Then try to get token from handshake headers
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      return type === 'Bearer' ? token : undefined;
    }

    return undefined;
  }
}
