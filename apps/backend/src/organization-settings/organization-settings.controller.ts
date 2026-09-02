import { Body, Controller, Get, Patch } from '@nestjs/common';
import { OrganizationSettingsService } from './organization-settings.service';

@Controller('organization-settings')
export class OrganizationSettingsController {
  constructor(private readonly settingsService: OrganizationSettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  update(@Body() body: Record<string, unknown>) {
    return this.settingsService.update(body);
  }
}
