import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { RolesGuard } from "../admin-auth/roles.guard";
import { Roles } from "../admin-auth/roles.decorator";
import { AttendeesService } from "./attendees.service";
import { CreateAdminAttendeeDto } from "./dto/create-admin-attendee.dto";

@Controller("admin/attendees")
@UseGuards(AdminGuard, RolesGuard)
export class AdminAttendeesController {
  constructor(private readonly attendees: AttendeesService) {}

  // Badge-printing list — superadmin only (RolesGuard default).
  @Get()
  async list() {
    return this.attendees.listForBadges();
  }

  // Search/manage list — registration staff needs this to find attendees.
  @Get("manage")
  @Roles("SUPERADMIN", "REGISTRATION_STAFF")
  async manage() {
    return this.attendees.listForAdminManagement();
  }

  @Get("manage/:id")
  @Roles("SUPERADMIN", "REGISTRATION_STAFF")
  async manageProfile(@Param("id") id: string) {
    return this.attendees.getAdminProfile(id);
  }

  @Post()
  @Roles("SUPERADMIN", "REGISTRATION_STAFF")
  async create(@Body() dto: CreateAdminAttendeeDto) {
    return this.attendees.createForAdmin(dto);
  }

  @Post("manage")
  @Roles("SUPERADMIN", "REGISTRATION_STAFF")
  async createFromManage(@Body() dto: CreateAdminAttendeeDto) {
    return this.attendees.createForAdmin(dto);
  }

  // Soft delete — superadmin only (RolesGuard default). Registration staff
  // must not be able to remove attendee records.
  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.attendees.softDeleteForAdmin(id);
  }
}
