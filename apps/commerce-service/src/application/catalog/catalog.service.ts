import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RingTemplateRepository } from '../../repositories/ring-template.repository';
import {
  toConfigurationOptionsRecord,
  toRingTemplateDetailRecord,
  toRingTemplateSummaryRecord,
  toTemplate3DAssetsRecord,
  type ConfigurationOptionsRecord,
  type RingTemplateDetailRecord,
  type RingTemplateSummaryRecord,
  type Template3DAssetsRecord,
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

  async getActiveRingTemplateDetail(
    templateId: string,
  ): Promise<RingTemplateDetailRecord> {
    const template = await this.ringTemplates.findById(templateId);

    if (template === null || template.status !== 'ACTIVE') {
      throw new NotFoundException('Ring template not found');
    }

    return toRingTemplateDetailRecord(template);
  }

  async getConfigurationOptions(
    templateId: string,
  ): Promise<ConfigurationOptionsRecord> {
    const data =
      await this.ringTemplates.findConfigurationOptionsByTemplateId(templateId);

    if (data === null) {
      throw new NotFoundException('Ring template not found');
    }

    return toConfigurationOptionsRecord({
      variants: data.template.variants,
      gemstoneGroups: data.template.gemstoneGroups,
      compatibilities: data.compatibilities,
    });
  }

  async getTemplate3DAssets(
    templateId: string,
  ): Promise<Template3DAssetsRecord> {
    const template =
      await this.ringTemplates.find3DAssetsByTemplateId(templateId);

    if (template === null) {
      throw new NotFoundException('Ring template not found');
    }

    return toTemplate3DAssetsRecord(template);
  }
}

