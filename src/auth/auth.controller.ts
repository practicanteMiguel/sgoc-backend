import {
  Controller, Post, Get, Body, Query,
  UseGuards, Req, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UsersService } from '../users/users.service';

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
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Req() req: Request, @Body() _dto: LoginDto) {
    return this.authService.login(
      req.user,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  me(@CurrentUser() user: any) {
    return user;
  }

  // Endpoint público — el usuario llega desde el link del email
  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar correo electrónico via token' })
  verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyEmail(token);
  }
}