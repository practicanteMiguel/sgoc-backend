import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { LogbookService } from './logbook.service';
import { CreateWeeklyLogDto } from './dto/create-weekly-log.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('Logbook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('logbook')
export class LogbookController {
  constructor(private readonly service: LogbookService) {}

  @Post()
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Create weekly log for a crew' })
  create(@Body() dto: CreateWeeklyLogDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List weekly logs. Filter by crew_id, year, week' })
  findAll(
    @Query('page')    page = 1,
    @Query('limit')   limit = 20,
    @Query('crew_id') crewId?: string,
    @Query('year')    year?: number,
    @Query('week')    week?: number,
  ) {
    return this.service.findAll(+page, +limit, crewId, year ? +year : undefined, week ? +week : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get weekly log with all its activities' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/activities')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add activity with images (before, during, after)' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image_before', maxCount: 1 },
    { name: 'image_during', maxCount: 1 },
    { name: 'image_after',  maxCount: 1 },
  ]))
  addActivity(
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
    @UploadedFiles() files: {
      image_before?: Express.Multer.File[];
      image_during?: Express.Multer.File[];
      image_after?:  Express.Multer.File[];
    },
  ) {
    return this.service.addActivity(id, dto, files ?? {});
  }

  @Patch(':id/activities/:activityId')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update activity — replaces any images sent' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image_before', maxCount: 1 },
    { name: 'image_during', maxCount: 1 },
    { name: 'image_after',  maxCount: 1 },
  ]))
  updateActivity(
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
    @UploadedFiles() files: {
      image_before?: Express.Multer.File[];
      image_during?: Express.Multer.File[];
      image_after?:  Express.Multer.File[];
    },
  ) {
    return this.service.updateActivity(activityId, dto, files ?? {});
  }

  @Delete(':id/activities/:activityId')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Remove activity from weekly log' })
  removeActivity(@Param('activityId') activityId: string) {
    return this.service.removeActivity(activityId);
  }
}
