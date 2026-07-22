import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { AttendeesService } from "./attendees.service";
import { CreateAdminAttendeeDto } from "./dto/create-admin-attendee.dto";

@Controller("admin/attendees")
@UseGuards(AdminGuard)
export class AdminAttendeesController {
  constructor(private readonly attendees: AttendeesService) {}

  @Get()
  async list() {
    return this.attendees.listForBadges();
  }

  @Get("manage")
  async manage() {
    return this.attendees.listForAdminManagement();
  }

  @Get("manage/:id")
  async manageProfile(@Param("id") id: string) {
    return this.attendees.getAdminProfile(id);
  }

  @Post()
  async create(@Body() dto: CreateAdminAttendeeDto) {
    return this.attendees.createForAdmin(dto);
  }

  @Post("manage")
  async createFromManage(@Body() dto: CreateAdminAttendeeDto) {
    return this.attendees.createForAdmin(dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.attendees.softDeleteForAdmin(id);
  }
}
