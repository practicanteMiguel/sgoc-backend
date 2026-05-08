import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insumo, CategoriaInsumo } from './entities/insumo.entity';
import { CreateInsumoDto, UpdateInsumoDto } from './dto/create-insumo.dto';

const PREFIJO: Record<CategoriaInsumo, string> = {
  [CategoriaInsumo.PAPELERIA]:  'PAP',
  [CategoriaInsumo.CONSUMIBLE]: 'CON',
  [CategoriaInsumo.EPP]:        'EPP',
};

@Injectable()
export class InsumosService {
  constructor(
    @InjectRepository(Insumo) private repo: Repository<Insumo>,
  ) {}

  private async generarCodigo(categoria: CategoriaInsumo): Promise<string> {
    const prefijo = PREFIJO[categoria];
    const ultimo = await this.repo
      .createQueryBuilder('i')
      .where('i.categoria = :categoria', { categoria })
      .orderBy('i.codigo', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultimo) {
      const num = parseInt(ultimo.codigo.split('-')[1], 10);
      siguiente = num + 1;
    }
    return `${prefijo}-${String(siguiente).padStart(3, '0')}`;
  }

  async create(dto: CreateInsumoDto) {
    const codigo = await this.generarCodigo(dto.categoria);
    const insumo = this.repo.create({ ...dto, codigo });
    return this.repo.save(insumo);
  }

  async remove(id: string) {
    const insumo = await this.findOne(id);
    await this.repo.remove(insumo);
    return { message: 'Insumo eliminado correctamente' };
  }

  async findAll(
    page = 1,
    limit = 20,
    categoria?: CategoriaInsumo,
    search?: string,
    activo?: boolean,
  ) {
    const qb = this.repo
      .createQueryBuilder('i')
      .orderBy('i.categoria', 'ASC')
      .addOrderBy('i.codigo', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoria) qb.andWhere('i.categoria = :categoria', { categoria });
    if (activo !== undefined) qb.andWhere('i.activo = :activo', { activo });
    if (search) qb.andWhere('i.descripcion ILIKE :search', { search: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const insumo = await this.repo.findOne({ where: { id } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  async update(id: string, dto: UpdateInsumoDto) {
    const insumo = await this.findOne(id);
    Object.assign(insumo, dto);
    return this.repo.save(insumo);
  }
}
