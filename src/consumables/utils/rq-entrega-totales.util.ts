import { Repository, In } from 'typeorm';
import { RequisicionItem } from '../entities/requisicion-item.entity';
import { RequisicionItemAdicional } from '../entities/requisicion-item-adicional.entity';
import { RequisicionEntregaEvento } from '../entities/requisicion-entrega-evento.entity';

export interface EntregaTotales {
  total_solicitado: number;
  total_recibido: number;
  total_general: number;
  entrega_completa: boolean | null;
  tiene_faltante: boolean;
  items_pendientes: number;
  fecha_primera_entrega: string | null;
}

interface SumRow {
  requisicion_id: string;
  solicitado: string | null;
  recibido: string | null;
  faltantes_count: string | null;
  total_general: string | null;
}

/**
 * Calcula, en lote (sin N+1), los totales de entrega y si aun queda algo
 * pendiente por RQ. `tiene_faltante` es por-item (recibido < solicitado en
 * al menos un item), a diferencia de `entrega_completa` que compara sumas
 * totales y puede dar un falso "completo" si un item quedo corto y otro se
 * entrego de mas (se cancelan en la suma).
 */
export async function computeEntregaTotalesBatch(
  itemRepo: Repository<RequisicionItem>,
  adicionalRepo: Repository<RequisicionItemAdicional>,
  eventoRepo: Repository<RequisicionEntregaEvento>,
  rqIds: string[],
  recepcionCompletadaMap: Map<string, boolean>,
): Promise<Map<string, EntregaTotales>> {
  const result = new Map<string, EntregaTotales>();
  if (rqIds.length === 0) return result;

  const [itemSums, adicionalSums, eventos] = await Promise.all([
    itemRepo
      .createQueryBuilder('i')
      .leftJoin('i.insumo', 'insumo')
      .select('i.requisicion_id', 'requisicion_id')
      .addSelect('SUM(COALESCE(i.solicitado,0))', 'solicitado')
      .addSelect('SUM(COALESCE(i.recibido,0))', 'recibido')
      .addSelect(
        'SUM(CASE WHEN COALESCE(i.recibido,0) < COALESCE(i.solicitado,0) THEN 1 ELSE 0 END)',
        'faltantes_count',
      )
      .addSelect(
        'SUM(COALESCE(i.solicitado,0) * COALESCE(insumo.valor_unitario,0))',
        'total_general',
      )
      .where('i.requisicion_id IN (:...ids)', { ids: rqIds })
      .groupBy('i.requisicion_id')
      .getRawMany<SumRow>(),
    adicionalRepo
      .createQueryBuilder('a')
      .select('a.requisicion_id', 'requisicion_id')
      .addSelect('SUM(COALESCE(a.solicitado,0))', 'solicitado')
      .addSelect('SUM(COALESCE(a.recibido,0))', 'recibido')
      .addSelect(
        'SUM(CASE WHEN COALESCE(a.recibido,0) < COALESCE(a.solicitado,0) THEN 1 ELSE 0 END)',
        'faltantes_count',
      )
      .addSelect(
        'SUM(COALESCE(a.solicitado,0) * COALESCE(a.valor_unitario,0))',
        'total_general',
      )
      .where('a.requisicion_id IN (:...ids)', { ids: rqIds })
      .groupBy('a.requisicion_id')
      .getRawMany<SumRow>(),
    eventoRepo.find({
      where: { requisicion_id: In(rqIds) },
      order: { created_at: 'ASC' },
    }),
  ]);

  const primeraEntregaPorRq = new Map<string, string>();
  for (const ev of eventos) {
    if (!primeraEntregaPorRq.has(ev.requisicion_id)) {
      primeraEntregaPorRq.set(ev.requisicion_id, ev.fecha_entrega);
    }
  }

  const acumulado = new Map<
    string,
    {
      solicitado: number;
      recibido: number;
      faltantes: number;
      total_general: number;
    }
  >();
  for (const row of [...itemSums, ...adicionalSums]) {
    const prev = acumulado.get(row.requisicion_id) ?? {
      solicitado: 0,
      recibido: 0,
      faltantes: 0,
      total_general: 0,
    };
    acumulado.set(row.requisicion_id, {
      solicitado: prev.solicitado + Number(row.solicitado ?? 0),
      recibido: prev.recibido + Number(row.recibido ?? 0),
      faltantes: prev.faltantes + Number(row.faltantes_count ?? 0),
      total_general: prev.total_general + Number(row.total_general ?? 0),
    });
  }

  for (const id of rqIds) {
    const sums = acumulado.get(id) ?? {
      solicitado: 0,
      recibido: 0,
      faltantes: 0,
      total_general: 0,
    };
    const recepcionCompletada = recepcionCompletadaMap.get(id) ?? false;
    result.set(id, {
      total_solicitado: sums.solicitado,
      total_recibido: sums.recibido,
      total_general: sums.total_general,
      entrega_completa: recepcionCompletada
        ? sums.solicitado === sums.recibido
        : null,
      tiene_faltante: recepcionCompletada && sums.faltantes > 0,
      items_pendientes: sums.faltantes,
      fecha_primera_entrega: primeraEntregaPorRq.get(id) ?? null,
    });
  }

  return result;
}
