import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { CheckinService } from "./checkin.service";
import { GeolocationCheckinDto } from "./dto/geolocation-checkin.dto";
import { QrScanCheckinDto } from "./dto/qr-scan-checkin.dto";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";

@Controller()
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Post("checkin/geolocation")
  @UseGuards(SessionGuard)
  async geolocation(@Req() req: RequestWithAttendee, @Body() dto: GeolocationCheckinDto) {
    return this.checkin.checkInByGeolocation(req.attendeeId, dto.lat, dto.lng);
  }

  @Post("checkin/manual")
  @UseGuards(SessionGuard)
  async manual(@Req() req: RequestWithAttendee) {
    return this.checkin.checkInManual(req.attendeeId);
  }

  @Get("checkin/me")
  @UseGuards(SessionGuard)
  async me(@Req() req: RequestWithAttendee) {
    return this.checkin.getMyStatus(req.attendeeId);
  }

  // Not yet behind an admin login gate — see PF3 (Admin Login) in FEATURES.md,
  // same known gap as /admin/import.
  @Post("admin/checkin/qr-scan")
  async qrScan(@Body() dto: QrScanCheckinDto) {
    return this.checkin.checkInByStaffQrScan(dto.qrToken);
  }

  @Get("admin/checkin/status")
  async status() {
    return this.checkin.getAdminStatus();
  }
}
