import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MembershipApplication,
  MembershipApplicationSchema,
} from './schemas/membership-application.schema';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MembershipApplication.name, schema: MembershipApplicationSchema },
    ]),
    UsersModule,
  ],
  providers: [MembershipService],
  controllers: [MembershipController],
  exports: [MembershipService],
})
export class MembershipModule {}
