import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Settings, SettingsSchema } from './schemas/settings.schema';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Settings.name, schema: SettingsSchema }])],
  providers: [SettingsService],
  controllers: [SettingsController],
  // Exported so CartService can price delivery from the database rather than
  // from the cached ConfigService.
  exports: [SettingsService],
})
export class SettingsModule {}
