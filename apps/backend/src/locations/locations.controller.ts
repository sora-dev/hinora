import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  listLocations(@Query() query: Record<string, string | undefined>) {
    return this.locationsService.listLocations(query);
  }

  @Get('options')
  listOptions() {
    return this.locationsService.listOptions();
  }

  @Get(':id')
  getLocation(@Param('id') id: string) {
    return this.locationsService.getLocation(id);
  }

  @Post()
  createLocation(@Body() body: Record<string, unknown>) {
    return this.locationsService.createLocation(body);
  }

  @Patch(':id')
  updateLocation(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.locationsService.updateLocation(id, body);
  }

  @Delete(':id')
  deleteLocation(@Param('id') id: string) {
    return this.locationsService.deleteLocation(id);
  }
}
