import { Module } from "@nestjs/common";
import { PhotosController } from "./photos.controller";
import { AdminPhotosController } from "./admin-photos.controller";
import { PhotosService } from "./photos.service";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";

@Module({
  imports: [RateLimitModule],
  controllers: [PhotosController, AdminPhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
