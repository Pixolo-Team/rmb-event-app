import { Controller, Get } from "@nestjs/common";
import { AttendeesService } from "./attendees.service";

// Not yet behind an admin login gate — see PF3 (Admin Login) in FEATURES.md,
// same known gap as /admin/import.
@Controller("admin/attendees")
export class AdminAttendeesController {
  constructor(private readonly attendees: AttendeesService) {}

  @Get()
  async list() {
    return this.attendees.listForBadges();
  }
}
