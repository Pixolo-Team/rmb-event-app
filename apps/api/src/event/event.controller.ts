import { Body, Controller, Get, Patch } from "@nestjs/common";
import { EventService } from "./event.service";
import { UpdateEventDto } from "./dto/update-event.dto";

// Not yet behind an admin login gate — see PF3 (Admin Login) in FEATURES.md,
// same known gap as /admin/import.
@Controller("admin/event")
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
