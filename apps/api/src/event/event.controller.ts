import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { EventService } from "./event.service";
import { UpdateEventDto } from "./dto/update-event.dto";

@Controller("admin/event")
@UseGuards(AdminGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async get() {
    return this.eventService.getOrCreate();
  }

  @Patch()
  async update(@Body() dto: UpdateEventDto) {
    return this.eventService.updateVenue(dto);
  }
}
