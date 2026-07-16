import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { SessionModule } from "./session/session.module";
import { AuthModule } from "./auth/auth.module";
import { AdminImportModule } from "./admin-import/admin-import.module";
import { AttendeesModule } from "./attendees/attendees.module";
import { EventModule } from "./event/event.module";
import { CheckinModule } from "./checkin/checkin.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    PrismaModule,
    MailModule,
    WhatsAppModule,
    SessionModule,
    AuthModule,
    AdminImportModule,
    AttendeesModule,
    EventModule,
    CheckinModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
