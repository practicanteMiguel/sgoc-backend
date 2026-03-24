import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('audit-logs')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }
    
    @Get()
    findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
        return this.auditService.findAll(+page, +limit);
    }
}
