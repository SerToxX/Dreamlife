import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { MailModule } from '../../common/mail/mail.module';
import { PdfModule } from '../../common/pdf/pdf.module';

@Module({
  imports: [MailModule, PdfModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
