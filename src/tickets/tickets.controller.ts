import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetCurrentUserId } from 'src/common/decorators';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @GetCurrentUserId() userId: string,
  ) {
    console.log('userId', userId);
    console.log('createTicketDto', createTicketDto);
    return this.ticketsService.create(createTicketDto, userId);
  }

  @Get()
  async findAll(@GetCurrentUserId() userId: string) {
    // Check if user is an agent
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // If user is an agent, return all tickets, otherwise return only their tickets
    if (user?.role === 'AGENT') {
      return this.ticketsService.findAllForAgent();
    } else {
      return this.ticketsService.findAll(userId);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.ticketsService.findOne(id, userId);
  }

  @Post(':id/replies')
  async addReply(
    @Param('id') id: string,
    @Body() createReplyDto: CreateReplyDto,
    @GetCurrentUserId() userId: string,
  ) {
    // Check if the ticket is closed
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { status: true },
    });

    if (ticket?.status === 'CLOSED') {
      throw new ForbiddenException('Cannot add replies to a closed ticket');
    }

    return this.ticketsService.addReply(id, createReplyDto, userId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTicketStatusDto,
    @GetCurrentUserId() userId: string,
  ) {
    // Check if user is an agent
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'AGENT') {
      throw new ForbiddenException('Only agents can update ticket status');
    }

    return this.ticketsService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(+id, updateTicketDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(+id);
  }
}
