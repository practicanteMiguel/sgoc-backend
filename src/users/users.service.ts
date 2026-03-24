import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { Role } from '../roles/entities/role.entity';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)     private userRepo: Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)     private roleRepo: Repository<Role>,
    private readonly mailService: MailService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.userRepo.findAndCount({
      relations: ['user_roles', 'user_roles.role'],
      withDeleted: false,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['user_roles', 'user_roles.role'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['user_roles', 'user_roles.role'],
    });
  }

  // ── Crear usuario — solo admin ─────────────────────────────────
  async create(dto: CreateUserDto, createdBy: User) {
    const exists = await this.findByEmail(dto.email);
    if (exists) throw new ConflictException('El email ya está registrado');

    if (dto.role_slug === 'module_manager' && !dto.module)
      throw new BadRequestException('El módulo es obligatorio para encargados');
    if (dto.role_slug === 'supervisor' && !dto.field)
      throw new BadRequestException('El campo es obligatorio para supervisores');

    const tempPassword       = dto.temp_password ?? this.generateTempPassword();
    const password_hash       = await bcrypt.hash(tempPassword, 10);
    const verificationToken   = randomUUID();

    const user = this.userRepo.create({
      email:                    dto.email,
      password_hash,
      first_name:               dto.first_name,
      last_name:                dto.last_name,
      phone:                    dto.phone,
      position:                 dto.position,
      module:                   dto.module,
      field:                    dto.field,
      is_active:                true,
      is_email_verified:        false,
      is_first_login:           true,
      email_verification_token: verificationToken,
      created_by:               createdBy,
    });

    const saved = await this.userRepo.save(user);

    const role = await this.roleRepo.findOne({ where: { slug: dto.role_slug } });
    if (role) {
      await this.userRoleRepo.save({ user: saved, role, created_by: createdBy });
    }

    // Enviar email con Resend
    await this.mailService.sendVerificationEmail(
      saved.email,
      saved.first_name,
      verificationToken,
      tempPassword,
    );

    return this.findById(saved.id);
  }

  // ── Verificar email ────────────────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({
      where: { email_verification_token: token },
    });
    if (!user)
      throw new BadRequestException('Token de verificación inválido o expirado');
    if (user.is_email_verified)
      return { message: 'El correo ya fue verificado anteriormente' };

    await this.userRepo.update(user.id, {
      is_email_verified:        true,
      email_verification_token: undefined,
    });

    return { message: 'Correo verificado. Ya podés iniciar sesión.' };
  }

  // ── Cambio de contraseña propio ────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Si no es primer login exigimos la contraseña actual
    if (!user.is_first_login) {
      if (!dto.current_password)
        throw new BadRequestException('Debes ingresar tu contraseña actual');
      const valid = await bcrypt.compare(dto.current_password, user.password_hash);
      if (!valid)
        throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const password_hash = await bcrypt.hash(dto.new_password, 10);

    await this.userRepo.update(userId, {
      password_hash,
      is_first_login:      false,
      password_changed_at: new Date(),
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  // ── Reset de contraseña por admin ──────────────────────────────
  async adminResetPassword(targetUserId: string, dto: AdminResetPasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const password_hash = await bcrypt.hash(dto.new_password, 10);

    await this.userRepo.update(targetUserId, {
      password_hash,
      is_first_login:      true,  // fuerza cambio al próximo login
      password_changed_at: new Date(),
    });

    await this.mailService.sendPasswordResetByAdmin(
      user.email,
      user.first_name,
      dto.new_password,
    );

    return { message: `Contraseña de ${user.first_name} actualizada. Se le notificó por correo.` };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    await this.userRepo.save({ ...user, ...dto });
    return this.findById(id);
  }

  async remove(id: string) {
    await this.findById(id);
    await this.userRepo.softDelete(id);
    return { message: 'Usuario eliminado correctamente' };
  }

  async updateLastLogin(id: string) {
    await this.userRepo.update(id, { last_login_at: new Date() });
  }

  private generateTempPassword(): string {
    const chars    = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const specials = '!@#$%';
    let pass = '';
    for (let i = 0; i < 7; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    return pass + specials[Math.floor(Math.random() * specials.length)];
  }
}