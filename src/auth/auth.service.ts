import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Session } from '../users/entities/session.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.is_active)
      throw new UnauthorizedException('Credenciales inválidas');

    
    if (!user.is_email_verified)
      throw new UnauthorizedException(
        'Debes verificar tu correo electrónico antes de ingresar',
      );

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      throw new UnauthorizedException('Credenciales inválidas');

    return user;
  }

  async login(user: any, ip: string, userAgent: string) {
    const roles = user.user_roles?.map((ur: any) => ur.role.slug) ?? [];
    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret:     this.config.get('JWT_REFRESH_SECRET'),
      expiresIn:  this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionRepo.create({
      refresh_token: refreshToken,
      ip_address:    ip,
      user_agent:    userAgent,
      expires_at:    expiresAt,
    });
    session.user = { id: user.id } as any;
    await this.sessionRepo.save(session);

    await this.usersService.updateLastLogin(user.id);

    return {
      access_token:  accessToken,
      refresh_token: refreshToken,
      user: {
        id:             user.id,
        email:          user.email,
        first_name:     user.first_name,
        last_name: user.last_name,
        phone:          user.phone,
        position:       user.position,
        module:         user.module,
        field:          user.field,
        roles,
        is_first_login: user.is_first_login,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const session = await this.sessionRepo.findOne({
        where: { refresh_token: refreshToken, is_active: true },
      });
      if (!session)
        throw new UnauthorizedException('Sesión inválida');

      const user       = await this.usersService.findById(payload.sub);
      const roles      = user.user_roles?.map((ur: any) => ur.role.slug) ?? [];
      const newPayload = { sub: user.id, email: user.email, roles };

      return { access_token: this.jwtService.sign(newPayload) };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(refreshToken: string) {
    await this.sessionRepo.update(
      { refresh_token: refreshToken },
      { is_active: false, revoked_at: new Date() },
    );
    return { message: 'Sesión cerrada correctamente' };
  }
}