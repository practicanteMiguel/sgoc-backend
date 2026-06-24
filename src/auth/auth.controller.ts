import {
  Controller, Post, Get, Body, Query,
  UseGuards, Req, Res, HttpCode, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty, ApiCookieAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}

const REFRESH_COOKIE = 'refresh_token';

function cookieOpts(clear = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    ...(clear ? { maxAge: 0 } : { maxAge: 7 * 24 * 60 * 60 * 1000 }),
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Iniciar sesión — refresh_token emitido como cookie HttpOnly' })
  async login(
    @Req() req: Request,
    @Body() _dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      req.user,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
    const { refresh_token, ...body } = result;
    res.cookie(REFRESH_COOKIE, refresh_token, cookieOpts());
    return body;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Renovar access token — lee y rota la cookie refresh_token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Refresh token ausente');
    const result = await this.authService.refresh(token);
    const { refresh_token, ...body } = result;
    res.cookie(REFRESH_COOKIE, refresh_token, cookieOpts());
    return body;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Cerrar sesión — invalida sesion y limpia la cookie' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await this.authService.logout(token);
    res.cookie(REFRESH_COOKIE, '', cookieOpts(true));
    return { message: 'Sesión cerrada correctamente' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  me(@CurrentUser() user: any) {
    return user;
  }

  // Token en body — el frontend extrae el token de la URL y lo envía via POST
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificar correo electrónico (token en body)' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.usersService.verifyEmail(dto.token);
  }

  // Mantenido por compatibilidad con links de email anteriores — preferir POST
  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar correo electrónico via query param (deprecated)' })
  verifyEmailGet(@Query('token') token: string) {
    return this.usersService.verifyEmail(token);
  }
}
