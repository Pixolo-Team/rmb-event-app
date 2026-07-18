import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { CsrfGuard } from "./common/csrf/csrf.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { SessionModule } from "./session/session.module";
import { AuthModule } from "./auth/auth.module";
import { AdminAuthModule } from "./admin-auth/admin-auth.module";
import { AdminImportModule } from "./admin-import/admin-import.module";
import { AttendeesModule } from "./attendees/attendees.module";
import { BookmarksModule } from "./bookmarks/bookmarks.module";
import { PhotosModule } from "./photos/photos.module";
import { ConnectionsModule } from "./connections/connections.module";
import { EventModule } from "./event/event.module";
import { CheckinModule } from "./checkin/checkin.module";
import { MatchingModule } from "./matching/matching.module";
import { MeetingsModule } from "./meetings/meetings.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { AppController } from "./app.controller";
import { HealthModule } from "./health/health.module";
import { SummaryModule } from "./summary/summary.module";
import { StatsModule } from "./stats/stats.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { QRModule } from "./qr/qr.module";

@Module({
  imports: [
    HealthModule,
    PrismaModule,
    MailModule,
    WhatsAppModule,
    SessionModule,
    AuthModule,
    AdminAuthModule,
    QRModule,
    AdminImportModule,
    AttendeesModule,
    BookmarksModule,
    PhotosModule,
    ConnectionsModule,
    EventModule,
    CheckinModule,
    MatchingModule,
    MeetingsModule,
    LeaderboardModule,
    SummaryModule,
    StatsModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
