import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { CreateReplyDto } from './dto/create-reply.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class TicketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @WebSocketServer()
  server: Server;

  // Handle client connections with auth validation
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        console.error('No token found in connection request');
        client.disconnect();
        return;
      }

      // Get JWT secret with fallback
      const secret =
        this.configService.get<string>('AT_SECRET') ||
        'fallback_secret_for_development';

      try {
        const payload = await this.jwtService.verifyAsync(token, { secret });

        // Store user data in socket instance
        client['user'] = payload;
        console.log(`Client connected: ${client.id}, user: ${payload.sub}`);
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError.message);
        client.disconnect();
      }
    } catch (error) {
      // Invalid token, disconnect client
      console.error('Authentication failed:', error.message);
      client.disconnect();
    }
  }

  // Extract token from socket handshake
  private extractToken(client: Socket): string | undefined {
    try {
      // Try auth field first
      const auth = client.handshake?.auth?.token;
      if (auth) return auth;

      // Try cookies from the handshake headers
      const cookieHeader = client.handshake?.headers?.cookie;
      if (cookieHeader && typeof cookieHeader === 'string') {
        // Parse cookies
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            acc[key.trim()] = decodeURIComponent(value.trim());
          }
          return acc;
        }, {});

        if (cookies['access_token']) {
          console.log(
            'Found access_token in cookies:',
            cookies['access_token'].substring(0, 10) + '...',
          );
          return cookies['access_token'];
        }
      }

      // Then try authorization header
      const authHeader = client.handshake?.headers?.authorization;
      if (authHeader && typeof authHeader === 'string') {
        const [type, token] = authHeader.split(' ');
        if (type === 'Bearer' && token) {
          console.log(
            'Found token in authorization header:',
            token.substring(0, 10) + '...',
          );
          return token;
        }
      }

      console.log('No token found in any source');
      return undefined;
    } catch (error) {
      console.error('Error extracting token:', error);
      return undefined;
    }
  }

  // Handle client disconnections
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Handle a client joining a ticket room
  @SubscribeMessage('joinTicket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    const roomName = `ticket:${ticketId}`;
    client.join(roomName);
    console.log(`Client ${client.id} joined ticket room: ${ticketId}`);

    // Inform others in the room that someone joined
    client.to(roomName).emit('userJoined', {
      message: 'A new user joined the conversation',
      timestamp: new Date(),
    });

    return { status: 'ok', message: `Joined ticket room: ${ticketId}` };
  }

  // Handle a client leaving a ticket room
  @SubscribeMessage('leaveTicket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    const roomName = `ticket:${ticketId}`;
    client.leave(roomName);
    console.log(`Client ${client.id} left ticket room: ${ticketId}`);
    return { status: 'ok', message: `Left ticket room: ${ticketId}` };
  }

  // Emit a new reply event to all clients in the ticket room
  notifyNewReply(ticketId: string, replyData: any) {
    const roomName = `ticket:${ticketId}`;
    console.log(`Emitting new reply to room ${roomName}`, replyData);
    this.server.to(roomName).emit('newReply', replyData);
  }

  // Emit a ticket status change event to all clients in the ticket room
  notifyStatusChange(ticketId: string, statusData: any) {
    const roomName = `ticket:${ticketId}`;
    console.log(`Emitting status change to room ${roomName}`, statusData);
    this.server.to(roomName).emit('statusChanged', statusData);
  }
}
