import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword } from "../common/password-hash";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { UpdateAdminUserDto } from "./dto/update-admin-user.dto";

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.adminUser.findMany({
      select: { id: true, name: true, username: true, role: true, active: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(dto: CreateAdminUserDto) {
    const existing = await this.prisma.adminUser.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException("Username already exists");

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.adminUser.create({
      data: { name: dto.name, username: dto.username, passwordHash, role: dto.role },
      select: { id: true, name: true, username: true, role: true, active: true, createdAt: true, lastLoginAt: true },
    });
    return user;
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Admin user not found");

    return this.prisma.adminUser.update({
      where: { id },
      data: {
        role: dto.role,
        active: dto.active,
        passwordHash: dto.password ? await hashPassword(dto.password) : undefined,
      },
      select: { id: true, name: true, username: true, role: true, active: true, createdAt: true, lastLoginAt: true },
    });
  }
}
