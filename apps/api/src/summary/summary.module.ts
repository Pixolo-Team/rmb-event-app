import { Module } from "@nestjs/common";
import { SummaryController } from "./summary.controller";
import { SummaryService } from "./summary.service";
import { UploadsModule } from "../uploads/uploads.module";
@Module({ imports: [UploadsModule], controllers: [SummaryController], providers: [SummaryService] })
export class SummaryModule {}
