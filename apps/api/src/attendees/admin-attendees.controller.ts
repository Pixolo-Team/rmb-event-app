import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { AttendeesService } from "./attendees.service";

@Controller("admin/attendees")
@UseGuards(AdminGuard)
export class AdminAttendeesController {
  constructor(private readonly attendees: AttendeesService) {}

  @Get()
  async list() {
    return this.attendees.listForBadges();
  }
}
