import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { AdminImportService } from "./admin-import.service";
import { ColumnMappingError } from "./column-mapper";

@Controller("admin/import")
export class AdminImportController {
  constructor(private readonly adminImport: AdminImportService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async import(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    try {
      return await this.adminImport.importCsv(file.buffer, file.originalname);
    } catch (err) {
      if (err instanceof ColumnMappingError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
