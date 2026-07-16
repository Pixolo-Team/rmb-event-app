import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { SessionModule } from "./session/session.module";
import { AuthModule } from "./auth/auth.module";
import { AdminImportModule } from "./admin-import/admin-import.module";
import { AttendeesModule } from "./attendees/attendees.module";
import { BookmarksModule } from "./bookmarks/bookmarks.module";
import { PhotosModule } from "./photos/photos.module";
import { EventModule } from "./event/event.module";
import { CheckinModule } from "./checkin/checkin.module";
import { MatchingModule } from "./matching/matching.module";
import { MeetingsModule } from "./meetings/meetings.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { AppController } from "./app.controller";
import { SummaryModule } from "./summary/summary.module";
import { FeedbackModule } from "./feedback/feedback.module";

@Module({
  imports: [
    PrismaModule,
    MailModule,
    WhatsAppModule,
    SessionModule,
    AuthModule,
    AdminImportModule,
    AttendeesModule,
    BookmarksModule,
    PhotosModule,
    EventModule,
    CheckinModule,
    MatchingModule,
    MeetingsModule,
    LeaderboardModule,
    SummaryModule,
    FeedbackModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
