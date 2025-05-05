import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TicketsGateway } from './tickets.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService, TicketsGateway],
  exports: [TicketsService],
})
export class TicketsModule {}
