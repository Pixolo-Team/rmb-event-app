import { Module } from "@nestjs/common";
import { PhotosController } from "./photos.controller";
import { AdminPhotosController } from "./admin-photos.controller";
import { PhotosService } from "./photos.service";

@Module({
  controllers: [PhotosController, AdminPhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
