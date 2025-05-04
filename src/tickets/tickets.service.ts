import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReplyDto } from './dto/create-reply.dto';

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

  async findAllForAgent() {
    try {
      // Get all tickets with customer information
      const allTickets = await this.prisma.ticket.findMany({
        select: {
          id: true,
          subject: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Format the response to match the structure expected by the frontend
      const result = {
        id: 'agent',
        email: 'agent',
        firstName: 'Support Agent',
        tickets: allTickets.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          // Add these properties for the tickets table component
          userEmail: ticket.customer.email,
          userName: ticket.customer.firstName || 'Unknown',
        })),
      };

      return result;
    } catch (error) {
      console.error('Error fetching all tickets:', error);
      throw new Error('Error fetching all tickets');
    }
  }

  async findOne(id: string, userId: string) {
    try {
      // First check if the user is allowed to access this ticket
      const ticket = await this.prisma.ticket.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  email: true,
                  profileImage: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Get the user's role to check if they're an agent
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Check if the user is the customer, an assigned agent, or an agent (any agent can view tickets)
      if (
        ticket.customerId !== userId &&
        ticket.assignedToId !== userId &&
        user?.role !== 'AGENT'
      ) {
        throw new ForbiddenException('Not authorized to access this ticket');
      }

      // Format the response
      return {
        id: ticket.customer.id,
        email: ticket.customer.email,
        firstName: ticket.customer.firstName,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          message: ticket.replies[0]?.content || '', // First reply is the original message
          replies: ticket.replies.slice(1).map((reply) => ({
            id: reply.id,
            content: reply.content,
            createdAt: reply.createdAt,
            author: {
              id: reply.author.id,
              name: reply.author.firstName,
              email: reply.author.email,
              profileImage: reply.author.profileImage,
              role: reply.author.role,
            },
          })),
        },
      };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new Error('Error fetching ticket');
    }
  }

  async addReply(
    ticketId: string,
    createReplyDto: CreateReplyDto,
    userId: string,
  ) {
    try {
      // Check if the ticket exists and user has access
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          customerId: true,
          assignedToId: true,
          status: true,
        },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      if (ticket.status === 'CLOSED') {
        throw new ForbiddenException('Cannot add replies to a closed ticket');
      }

      // Get the user's role to check if they're an agent
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Check if the user is the customer, an assigned agent, or an agent (any agent can reply)
      if (
        ticket.customerId !== userId &&
        ticket.assignedToId !== userId &&
        user?.role !== 'AGENT'
      ) {
        throw new ForbiddenException('Not authorized to reply to this ticket');
      }

      // Create the reply
      const reply = await this.prisma.reply.create({
        data: {
          content: createReplyDto.content,
          authorId: userId,
          ticketId,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              email: true,
              profileImage: true,
              role: true,
            },
          },
        },
      });

      // Update the ticket's last updated timestamp
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      return {
        message: 'Reply added successfully',
        data: {
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt,
          author: {
            id: reply.author.id,
            name: reply.author.firstName,
            email: reply.author.email,
            profileImage: reply.author.profileImage,
            role: reply.author.role,
          },
        },
      };
    } catch (error) {
      console.error('Error adding reply:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new Error('Error adding reply');
    }
  }

  async updateStatus(ticketId: string, status: 'OPEN' | 'CLOSED') {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicket = await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status },
      });

      return {
        message: `Ticket status updated to ${status}`,
        data: {
          id: updatedTicket.id,
          status: updatedTicket.status,
        },
      };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Error updating ticket status');
    }
  }

  update(id: number, updateTicketDto: UpdateTicketDto) {
    return `This action updates a #${id} ticket`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticket`;
  }
}
