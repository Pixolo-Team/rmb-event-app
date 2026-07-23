import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { AdminUsersService } from "./admin-users.service";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { UpdateAdminUserDto } from "./dto/update-admin-user.dto";

// Superadmin-only by RolesGuard's default (no @Roles() needed), spelled out
// explicitly here for clarity since this manages who else gets admin access.
@Controller("admin/users")
@UseGuards(AdminGuard, RolesGuard)
@Roles("SUPERADMIN")
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  async list() {
    return this.adminUsers.list();
  }

  @Post()
  async create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsers.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminUsers.update(id, dto);
  }
}
