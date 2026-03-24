import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar audit logs con filtros opcionales' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  @ApiQuery({ name: 'module', required: false, type: String,
    description: 'Filtrar por módulo: users, roles, notifications...' })
  @ApiQuery({ name: 'action', required: false, type: String,
    description: 'Filtrar por acción: CREATE, UPDATE, DELETE' })
  @ApiQuery({ name: 'userId', required: false, type: String,
    description: 'Filtrar por usuario que realizó la acción' })
  findAll(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.findAll(
      page  ? +page  : 1,
      limit ? +limit : 50,
      module,
      action,
      userId,
    );
  }
}