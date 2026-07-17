import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ConnectionsService } from "./connections.service";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { ScanConnectionDto } from "./dto/scan-connection.dto";

@Controller("connections")
@UseGuards(SessionGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  async list(@Req() req: RequestWithAttendee) {
    return this.connections.listForAttendee(req.attendeeId);
  }

  @Post("scan")
  async scan(@Req() req: RequestWithAttendee, @Body() dto: ScanConnectionDto) {
    return this.connections.scan(req.attendeeId, dto.qrToken);
  }
}
