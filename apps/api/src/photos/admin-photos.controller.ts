import { Controller, Delete, Get, Param, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../admin-auth/admin.guard";
import { PhotosService } from "./photos.service";

@Controller("admin/photos")
@UseGuards(AdminGuard)
export class AdminPhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get()
  listAll() {
    return this.photos.adminListAll();
  }

  @Get("deleted")
  listDeleted() {
    return this.photos.adminListDeletedHistory();
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.photos.adminDelete(id);
    return { status: "ok" };
  }
}
