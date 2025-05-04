import { Injectable } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}
  async create(createTicketDto: CreateTicketDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });
    if (!user) {
      throw new Error('User not found');
    }

    const { subject, message } = createTicketDto;

    const ticket = await this.prisma.ticket.create({
      data: {
        subject,
        customerId: userId,
        replies: {
          create: {
            content: message,
            authorId: userId,
          },
        },
      },
    });

    return {
      message: 'Ticket created successfully',
      data: {
        userName: user.firstName,
        userEmail: user.email,
        id: ticket.id,
        subject: ticket.subject,
        userId: ticket.customerId,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    };

    return 'This action adds a new ticket';
  }

  async findAll(userId: string) {
    try {
      const tickets = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          tickets: {
            select: {
              id: true,
              subject: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!tickets) {
        throw new Error('No tickets found for this user');
      }
      return tickets;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw new Error('Error fetching tickets');
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} ticket`;
  }

  update(id: number, updateTicketDto: UpdateTicketDto) {
    return `This action updates a #${id} ticket`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticket`;
  }
}
