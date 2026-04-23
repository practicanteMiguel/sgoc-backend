import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { VoiceLog } from './entities/voice-log.entity';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryVoiceLogsDto } from './dto/query-voice-logs.dto';

@Injectable()
export class VoiceLogsService {
  private readonly apiKey: string;
  private readonly transcribeUrl =
    'https://api.mistral.ai/v1/audio/transcriptions';
  private readonly chatUrl = 'https://api.mistral.ai/v1/chat/completions';

  constructor(
    @InjectRepository(VoiceLog)
    private readonly repo: Repository<VoiceLog>,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('MISTRAL_API_KEY')!;
  }

  async transcribeAndSave(
    file: Express.Multer.File,
    userId: string,
  ): Promise<VoiceLog> {
    const result = await this.callVoxtral(file);
    const log = this.repo.create({
      user_id: userId,
      transcription: result.text,
      original_filename: file.originalname,
    });
    return this.repo.save(log) as Promise<VoiceLog>;
  }

  private async callVoxtral(
    file: Express.Multer.File,
  ): Promise<{ text: string }> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );
    form.append('model', 'voxtral-mini-2507');

    const res = await fetch(this.transcribeUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new BadRequestException(`Voxtral: ${msg}`);
    }
    return res.json() as Promise<{ text: string }>;
  }

  async findAllAdmin(query: QueryVoiceLogsDto): Promise<VoiceLog[]> {
    const where: Record<string, unknown> = {};

    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : new Date(0);
      const to = query.to ? new Date(query.to) : new Date();
      to.setHours(23, 59, 59, 999);
      where.created_at = Between(from, to);
    }

    return this.repo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findByUser(userId: string, query: QueryVoiceLogsDto): Promise<VoiceLog[]> {
    const where: Record<string, unknown> = { user_id: userId };

    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : new Date(0);
      const to = query.to ? new Date(query.to) : new Date();
      // end of day when only 'to' is provided
      to.setHours(23, 59, 59, 999);
      where.created_at = Between(from, to);
    }

    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  async findOne(id: string, userId: string): Promise<VoiceLog> {
    const log = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!log) throw new NotFoundException('Registro de voz no encontrado');
    return log;
  }

  async remove(id: string, userId: string): Promise<void> {
    const log = await this.findOne(id, userId);
    await this.repo.softDelete(log.id);
  }

  async generateReport(
    dto: GenerateReportDto,
    userId: string,
  ): Promise<{ title: string; report: string; sources: number }> {
    const logs = await this.repo.find({
      where: { id: In(dto.ids), user_id: userId },
      order: { created_at: 'ASC' },
    });

    if (logs.length === 0) {
      throw new NotFoundException('No se encontraron registros para el informe');
    }

    const title = dto.title ?? 'Informe de actividades';
    const context = logs
      .map(
        (l, i) =>
          `[${i + 1}] ${l.created_at.toISOString().split('T')[0]}: ${l.transcription}`,
      )
      .join('\n\n');

    const report = await this.callMistralChat(title, context);
    return { title, report, sources: logs.length };
  }

  private async callMistralChat(
    title: string,
    context: string,
  ): Promise<string> {
    const res = await fetch(this.chatUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente técnico. Redacta informes de actividad profesional en español, ' +
              'estructurados con secciones claras (resumen, actividades realizadas, logros/avances, ' +
              'temas recurrentes). Sé conciso y usa lenguaje técnico apropiado.',
          },
          {
            role: 'user',
            content: `Genera un informe técnico titulado "${title}" a partir de los siguientes registros de actividad diaria:\n\n${context}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new BadRequestException(`Mistral chat: ${msg}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0].message.content;
  }
}
