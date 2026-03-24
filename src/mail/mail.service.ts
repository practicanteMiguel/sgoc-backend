import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   this.config.get<string>('MAIL_HOST'),
      port:   this.config.get<number>('MAIL_PORT'),
      secure: false, // puerto 587 usa STARTTLS, no SSL directo
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
  }

  // ── Email de bienvenida con contraseña temporal y verificación ──
  async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string,
    tempPassword: string,
  ): Promise<void> {
    const verifyUrl = `${this.config.get('FRONTEND_URL')}/auth/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from:    this.config.get('MAIL_FROM'),
        to:      email,
        subject: 'Bienvenido — Activa tu cuenta',
        html:    this.welcomeTemplate(firstName, tempPassword, verifyUrl),
      });
      this.logger.log(`✅ Email de verificación enviado a ${email}`);
    } catch (err: any) {
      this.logger.error(`❌ Error enviando email a ${email}: ${err.message}`);
      throw new InternalServerErrorException(
        `No se pudo enviar el email de verificación: ${err.message}`,
      );
    }
  }

  // ── Email cuando el admin resetea la contraseña de un usuario ──
  async sendPasswordResetByAdmin(
    email: string,
    firstName: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from:    this.config.get('MAIL_FROM'),
        to:      email,
        subject: 'Tu contraseña fue actualizada',
        html:    this.resetPasswordTemplate(firstName, newPassword),
      });
      this.logger.log(`✅ Email de reset enviado a ${email}`);
    } catch (err: any) {
      this.logger.error(`❌ Error enviando email a ${email}: ${err.message}`);
      throw new InternalServerErrorException(
        `No se pudo enviar el email de reset: ${err.message}`,
      );
    }
  }

  // ── Templates HTML ──────────────────────────────────────────────
  private welcomeTemplate(
    firstName: string,
    tempPassword: string,
    verifyUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;
                    overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <div style="background:#1F3A6B;padding:32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Plataforma de Gestión</h1>
          </div>

          <div style="padding:32px;">
            <h2 style="color:#1F3A6B;margin:0 0 12px;">Hola, ${firstName}</h2>
            <p style="color:#444;line-height:1.6;">
              Tu cuenta ha sido creada. Primero verificá tu correo y luego
              ingresá con la contraseña temporal que te asignamos.
            </p>

            <div style="background:#f0f4ff;border:1px solid #c5d3ee;border-radius:8px;
                        padding:20px;margin:24px 0;text-align:center;">
              <p style="margin:0 0 6px;color:#666;font-size:13px;">
                Tu contraseña temporal
              </p>
              <p style="margin:0;font-size:26px;font-weight:bold;
                        letter-spacing:3px;color:#1F3A6B;">
                ${tempPassword}
              </p>
            </div>

            <div style="text-align:center;margin:28px 0;">
              <a href="${verifyUrl}"
                 style="display:inline-block;background:#1F3A6B;color:#fff;
                        padding:14px 32px;border-radius:8px;text-decoration:none;
                        font-weight:bold;font-size:15px;">
                Verificar mi cuenta
              </a>
            </div>

            <p style="color:#888;font-size:12px;text-align:center;margin-top:24px;">
              Al ingresar por primera vez se te pedirá elegir una contraseña propia.
            </p>
          </div>

        </div>
      </body></html>
    `;
  }

  private resetPasswordTemplate(
    firstName: string,
    newPassword: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;
                    overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <div style="background:#1F3A6B;padding:32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Plataforma de Gestión</h1>
          </div>

          <div style="padding:32px;">
            <h2 style="color:#1F3A6B;margin:0 0 12px;">Hola, ${firstName}</h2>
            <p style="color:#444;line-height:1.6;">
              El administrador actualizó tu contraseña de acceso.
            </p>

            <div style="background:#f0f4ff;border:1px solid #c5d3ee;border-radius:8px;
                        padding:20px;margin:24px 0;text-align:center;">
              <p style="margin:0 0 6px;color:#666;font-size:13px;">
                Tu nueva contraseña temporal
              </p>
              <p style="margin:0;font-size:26px;font-weight:bold;
                        letter-spacing:3px;color:#1F3A6B;">
                ${newPassword}
              </p>
            </div>

            <p style="color:#888;font-size:12px;text-align:center;">
              Al ingresar se te pedirá elegir una contraseña propia.
            </p>
          </div>

        </div>
      </body></html>
    `;
  }
}