import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ProductModule } from './product/product.module';
import { BookingModule } from './booking/booking.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PurchaseModule } from './purchase/purchase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    PrismaModule,
    ProductModule,
    BookingModule,
    PurchaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
