import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {
    sgMail.setApiKey(this.config.get<string>('SENDGRID_API_KEY'));
  }

  async sendMagicLink(email: string, token: string): Promise<void> {
    const magicLink = `${process.env.APP_URL}/api/auth/verify-magic-link?token=${token}`;

    const msg = {
      to: email,
      from: this.config.get<string>('SENDGRID_FROM_EMAIL'),
      subject: 'Your Magic Link to Sign In',
      html: this.getMagicLinkTemplate(magicLink),
    };

    console.log('magicLink', magicLink);

    try {
      await sgMail.send(msg);
    } catch (error) {
      throw error;
    }
  }

  private getMagicLinkTemplate(magicLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Complete Your Registration</h2>
        <p>Click the button below to verify your email and complete signup (link expires in 10 minutes):</p>
        <a href="${magicLink}" 
           style="background-color: #4CAF50; color: white; padding: 14px 20px; 
                  text-align: center; text-decoration: none; display: inline-block; 
                  border-radius: 4px;">
          Complete Signup
        </a>
        <p style="color: #666; margin-top: 20px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `;
  }
}
