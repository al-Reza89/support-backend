import { IsEnum, IsNotEmpty } from 'class-validator';

enum TicketStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export class UpdateTicketStatusDto {
  @IsNotEmpty()
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
