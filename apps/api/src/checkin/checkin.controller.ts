import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { CheckinService } from "./checkin.service";
import { GeolocationCheckinDto } from "./dto/geolocation-checkin.dto";
import { QrScanCheckinDto } from "./dto/qr-scan-checkin.dto";
import { VenueCheckinDto } from "./dto/venue-checkin.dto";
import { SessionGuard, RequestWithAttendee } from "../session/session.guard";
import { AdminGuard } from "../admin-auth/admin.guard";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";

@Controller()
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Post("checkin/geolocation")
  @UseGuards(SessionGuard, RateLimitGuard)
  @RateLimit(20)
  async geolocation(@Req() req: RequestWithAttendee, @Body() dto: GeolocationCheckinDto) {
    return this.checkin.checkInByGeolocation(req.attendeeId, dto.lat, dto.lng);
  }

  @Post("checkin/manual")
  @UseGuards(SessionGuard, RateLimitGuard)
  @RateLimit(20)
  async manual(@Req() req: RequestWithAttendee) {
    return this.checkin.checkInManual(req.attendeeId);
  }

  @Post("checkin/venue-qr")
  @UseGuards(SessionGuard, RateLimitGuard)
  @RateLimit(20)
  async venueQr(@Req() req: RequestWithAttendee, @Body() dto: VenueCheckinDto) {
    return this.checkin.checkInByVenueQr(req.attendeeId, dto.token);
  }

  @Get("checkin/me")
  @UseGuards(SessionGuard)
  async me(@Req() req: RequestWithAttendee) {
    return this.checkin.getMyStatus(req.attendeeId);
  }

  @Post("admin/checkin/qr-scan")
  @UseGuards(AdminGuard, RateLimitGuard)
  @RateLimit(120)
  async qrScan(@Body() dto: QrScanCheckinDto) {
    return this.checkin.checkInByStaffQrScan(dto.qrToken);
  }

  @Post("admin/checkin/manual/:attendeeId")
  @UseGuards(AdminGuard, RateLimitGuard)
  @RateLimit(120)
  async adminManual(@Param("attendeeId") attendeeId: string) {
    return this.checkin.checkInByAdminManual(attendeeId);
  }

  @Delete("admin/checkin/:attendeeId")
  @UseGuards(AdminGuard, RateLimitGuard)
  @RateLimit(120)
  async adminAbsent(@Param("attendeeId") attendeeId: string) {
    return this.checkin.markAbsentByAdmin(attendeeId);
  }

  @Get("admin/checkin/status")
  @UseGuards(AdminGuard)
  async status() {
    return this.checkin.getAdminStatus();
  }
}
