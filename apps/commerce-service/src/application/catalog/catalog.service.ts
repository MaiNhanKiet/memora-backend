import { BadRequestException, Injectable } from '@nestjs/common';
import { RingTemplateRepository } from '../../repositories/ring-template.repository';
import {
  toRingTemplateSummaryRecord,
  type RingTemplateSummaryRecord,
} from './catalog.mapper';

export interface ListRingTemplatesInput {
  stoneLayout?: string;
  package?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class CatalogService {
  constructor(private readonly ringTemplates: RingTemplateRepository) {}

  async listActiveRingTemplates(input: ListRingTemplatesInput): Promise<{
    items: RingTemplateSummaryRecord[];
    total: number;
  }> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const offset = Math.max(input.offset ?? 0, 0);

    if (
      input.stoneLayout !== undefined &&
      !['NONE', 'SINGLE', 'MULTI'].includes(input.stoneLayout)
    ) {
      throw new BadRequestException('stoneLayout is invalid');
    }

    if (
      input.package !== undefined &&
      !['FINGERPRINT', 'SOUNDWAVE'].includes(input.package)
    ) {
      throw new BadRequestException('package is invalid');
    }

    const { rows, total } = await this.ringTemplates.findManyPaginated({
      status: 'ACTIVE',
      stoneLayout: input.stoneLayout,
      package: input.package,
      skip: offset,
      take: limit,
    });

    return {
      items: rows.map(toRingTemplateSummaryRecord),
      total,
    };
  }
}
