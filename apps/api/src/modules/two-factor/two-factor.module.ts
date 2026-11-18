import { Module } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { EmailCodeDeliveryStrategy } from './strategies/email-code-delivery.strategy';
import { MailModule } from '../../common/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService, EmailCodeDeliveryStrategy],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
