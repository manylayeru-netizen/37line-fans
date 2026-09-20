import { Injectable, Logger } from '@nestjs/common';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string | undefined;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY || undefined;
    this.fromEmail = process.env.EMAIL_FROM || 'no-reply@37line.com';
    this.fromName = process.env.EMAIL_FROM_NAME || '37line 手帐日记';
  }

  isConfigured(): boolean {
    return !!this.resendApiKey;
  }

  async send(params: EmailParams): Promise<void> {
    if (!this.resendApiKey) {
      throw new Error(
        '邮件服务未配置。请设置 RESEND_API_KEY 环境变量以启用邮件发送功能。',
      );
    }

    const { to, subject, html } = params;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`邮件发送失败: ${response.status} ${text}`);
    }

    this.logger.log(`邮件已发送至 ${to}`);
  }

  async sendVerificationCode(
    email: string,
    code: string,
    purpose: string = 'register',
  ): Promise<void> {
    const purposeText = purpose === 'register' ? '注册' : purpose;
    const subject = `【37line】您的${purposeText}验证码是 ${code}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: #FFFAF0; border: 2px dashed #E8DDD0; border-radius: 12px; padding: 32px; text-align: center;">
          <h2 style="color: #6B4F3A; margin: 0 0 16px 0;">邮箱验证码</h2>
          <p style="color: #6B4F3A; margin: 0 0 24px 0; line-height: 1.6;">
            您正在进行<strong>${purposeText}</strong>操作，验证码为：
          </p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #F4A261; padding: 16px 0; border: 2px solid #F4A261; border-radius: 8px; display: inline-block; min-width: 200px; background: #FFF3D6;">
            ${code}
          </div>
          <p style="color: #6B4F3A; margin: 24px 0 0 0; font-size: 14px; line-height: 1.6;">
            验证码有效期为 10 分钟。<br/>
            如果不是您本人操作，请忽略此邮件。
          </p>
        </div>
        <p style="text-align: center; color: #6B4F3A; opacity: 0.6; font-size: 12px; margin-top: 24px;">
          来自 37line 手帐日记
        </p>
      </div>
    `;

    await this.send({ to: email, subject, html });
  }
}
