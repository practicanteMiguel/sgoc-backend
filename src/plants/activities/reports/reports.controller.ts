import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@ApiTags('Technical Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('technical-reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Create technical report from a log activity' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List technical reports. Filter by crew_id' })
  findAll(
    @Query('page')    page = 1,
    @Query('limit')   limit = 20,
    @Query('crew_id') crewId?: string,
  ) {
    return this.service.findAll(+page, +limit, crewId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get technical report (no images)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Update report fields' })
  update(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Delete technical report' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
