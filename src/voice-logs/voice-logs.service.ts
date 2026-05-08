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
  ): Promise<{
    title: string;
    days: { dayNumber: number; date: string; entries: string[] }[];
    sources: number;
  }> {
    const logs = await this.repo.find({
      where: { id: In(dto.ids), user_id: userId },
      order: { created_at: 'ASC' },
    });

    if (logs.length === 0) {
      throw new NotFoundException('No se encontraron registros para el informe');
    }

    const grouped = new Map<string, string[]>();
    for (const log of logs) {
      const date = log.created_at.toISOString().split('T')[0];
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date)!.push(log.transcription);
    }

    const sortedDates = [...grouped.keys()].sort();
    const context = sortedDates
      .map((date, i) => {
        const records = grouped.get(date)!;
        const lines = records.map((r, j) => `  Registro ${j + 1}: ${r}`).join('\n');
        return `DIA ${i + 1} (${date}):\n${lines}`;
      })
      .join('\n\n');

    const title = dto.title ?? 'Informe de actividades';
    const days = await this.callMistralStructured(title, context, sortedDates, grouped);
    return { title, days, sources: logs.length };
  }

  private async callMistralStructured(
    title: string,
    context: string,
    sortedDates: string[],
    grouped: Map<string, string[]>,
  ): Promise<{ dayNumber: number; date: string; entries: string[] }[]> {
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
              'Eres un asistente tecnico. Tu tarea es tomar registros de voz de actividad diaria y ' +
              'reescribirlos con lenguaje tecnico y profesional en espanol. ' +
              'Devuelve UNICAMENTE un JSON valido con este formato exacto: ' +
              '[{"dayNumber":1,"date":"YYYY-MM-DD","entries":["actividad pulida 1","actividad pulida 2"]},...]. ' +
              'Cada elemento de "entries" es un punto de actividad independiente y pulido. ' +
              'Si un dia tiene un solo registro largo, subdividelo en multiples entradas. ' +
              'No incluyas texto, markdown ni explicaciones fuera del JSON.',
          },
          {
            role: 'user',
            content: `Titulo del informe: "${title}"\n\nRegistros por dia:\n\n${context}`,
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

    const raw = data.choices[0].message.content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(raw) as { dayNumber: number; date: string; entries: string[] }[];
    } catch {
      return sortedDates.map((date, i) => ({
        dayNumber: i + 1,
        date,
        entries: grouped.get(date) ?? [],
      }));
    }
  }
}
