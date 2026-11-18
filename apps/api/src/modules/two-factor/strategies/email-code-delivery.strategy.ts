import { Injectable } from '@nestjs/common';
import { MailService } from '../../../common/mail/mail.service';
import { CodeDeliveryStrategy } from './code-delivery.strategy';

@Injectable()
export class EmailCodeDeliveryStrategy implements CodeDeliveryStrategy {
  constructor(private mail: MailService) {}

  async deliver(to: string, nombre: string, code: string, purpose: 'login' | 'enable' | 'register') {
    await this.mail.sendTwoFactorCode(to, nombre, code, purpose);
  }
}
