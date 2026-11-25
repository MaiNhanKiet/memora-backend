export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export interface PaginatedResult<T> {
  readonly rows: readonly T[];
  readonly total: number;
}

export interface FindTemplatesFilter {
  readonly skip: number;
  readonly take: number;
  readonly gender?: string;
  readonly search?: string;
  readonly status?: string;
}

export interface FindGemstonesFilter {
  readonly skip: number;
  readonly take: number;
  readonly stoneType?: string;
  readonly shape?: string;
  readonly isCertified?: boolean;
  readonly status?: string;
}

export interface RingTemplateRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly glbAssetKey: string;
  readonly stoneLayout: string;
  readonly designSupportedPersonalizationPackages: readonly string[];
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MaterialRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly materialFamily?: string;
  readonly purityPercent?: number;
  readonly color?: string;
  readonly status: string;
}

export interface TemplateVariantRecord {
  readonly id: string;
  readonly ringTemplateId: string;
  readonly materialId: string;
  readonly standardSize: number;
  readonly maxUpDelta?: number;
  readonly maxDownDelta?: number;
  readonly resizeMethod?: string;
  readonly addedMetalAllowed: boolean;
  readonly localWallThicknessMm: number;
  readonly minRemainingWallThicknessMm: number;
  readonly maxSafeEngravingDepthMm: number;
  readonly status: string;
}

export interface GemstoneOptionRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly stoneType: string;
  readonly shape: string;
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly colorGrade?: string;
  readonly clarityGrade?: string;
  readonly certifiedRequired: boolean;
  readonly status: string;
}

export interface GemstoneSlotRecord {
  readonly id: string;
  readonly slotIndex: number;
  readonly gemstoneGroupId: string;
  readonly glbNodeName: string;
  readonly isRequired: boolean;
}

export interface TemplateCompatibilityRecord {
  readonly templateVariantId: string;
  readonly gemstoneGroupId: string;
  readonly gemstoneOptionId: string;
}

export interface ResizePolicyVariantRecord extends TemplateVariantRecord {
  readonly templateName: string;
  readonly materialName: string;
}

export interface CreateTemplateInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly glbAssetKey: string;
  readonly stoneLayout: string;
  readonly designSupportedPersonalizationPackages: string[];
  readonly status: string;
  readonly createdByUserId?: string;
}

export interface UpdateTemplateInput {
  readonly name?: string;
  readonly description?: string;
  readonly glbAssetKey?: string;
  readonly stoneLayout?: string;
  readonly designSupportedPersonalizationPackages?: string[];
  readonly status?: string;
}

export interface CreateMaterialInput {
  readonly code: string;
  readonly name: string;
  readonly materialFamily?: string;
  readonly purityPercent?: number;
  readonly color?: string;
  readonly status: string;
}

export interface UpdateMaterialInput {
  readonly name?: string;
  readonly materialFamily?: string;
  readonly purityPercent?: number;
  readonly color?: string;
  readonly status?: string;
}

export interface CreateVariantInput {
  readonly ringTemplateId: string;
  readonly materialId: string;
  readonly standardSize: number;
  readonly maxUpDelta?: number;
  readonly maxDownDelta?: number;
  readonly resizeMethod?: string;
  readonly addedMetalAllowed: boolean;
  readonly localWallThicknessMm: number;
  readonly minRemainingWallThicknessMm: number;
  readonly maxSafeEngravingDepthMm: number;
  readonly status: string;
  readonly createdByUserId?: string;
}

export interface UpdateVariantInput {
  readonly standardSize?: number;
  readonly maxUpDelta?: number;
  readonly maxDownDelta?: number;
  readonly resizeMethod?: string;
  readonly addedMetalAllowed?: boolean;
  readonly localWallThicknessMm?: number;
  readonly minRemainingWallThicknessMm?: number;
  readonly maxSafeEngravingDepthMm?: number;
  readonly status?: string;
}

export interface CreateGemstoneOptionInput {
  readonly code: string;
  readonly name: string;
  readonly stoneType: string;
  readonly shape: string;
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly colorGrade?: string;
  readonly clarityGrade?: string;
  readonly certifiedRequired: boolean;
  readonly status: string;
}

export interface CatalogRepository {
  findManyTemplates(
    filter: FindTemplatesFilter,
  ): Promise<PaginatedResult<RingTemplateRecord>>;
  findTemplateById(id: string): Promise<RingTemplateRecord | null>;
  findTemplateByCode(code: string): Promise<RingTemplateRecord | null>;
  createTemplate(data: CreateTemplateInput): Promise<RingTemplateRecord>;
  updateTemplate(
    id: string,
    data: UpdateTemplateInput,
  ): Promise<RingTemplateRecord>;
  countVariantsForTemplate(templateId: string): Promise<number>;

  findManyMaterials(status?: string): Promise<MaterialRecord[]>;
  findMaterialById(id: string): Promise<MaterialRecord | null>;
  findMaterialByCode(code: string): Promise<MaterialRecord | null>;
  createMaterial(data: CreateMaterialInput): Promise<MaterialRecord>;
  updateMaterial(
    id: string,
    data: UpdateMaterialInput,
  ): Promise<MaterialRecord>;

  findVariantsByTemplateId(
    templateId: string,
    materialId?: string,
    status?: string,
  ): Promise<TemplateVariantRecord[]>;
  findVariantByTemplateMaterialAndSize(
    templateId: string,
    materialId: string,
    standardSize: number,
  ): Promise<TemplateVariantRecord | null>;
  findTemplateVariantById(id: string): Promise<TemplateVariantRecord | null>;
  createVariant(data: CreateVariantInput): Promise<TemplateVariantRecord>;
  updateVariant(
    id: string,
    data: UpdateVariantInput,
  ): Promise<TemplateVariantRecord>;

  findManyGemstoneOptions(
    filter: FindGemstonesFilter,
  ): Promise<PaginatedResult<GemstoneOptionRecord>>;
  findGemstoneOptionByCode(code: string): Promise<GemstoneOptionRecord | null>;
  createGemstoneOption(
    data: CreateGemstoneOptionInput,
  ): Promise<GemstoneOptionRecord>;

  findGemstoneSlotsByTemplateId(
    templateId: string,
  ): Promise<GemstoneSlotRecord[]>;

  findCompatibilities(
    variantId: string,
    gemstoneOptionIds: string[],
  ): Promise<TemplateCompatibilityRecord[]>;
  updateCompatibilities(
    templateVariantId: string,
    gemstoneGroupId: string,
    gemstoneOptionIds: string[],
  ): Promise<string[]>;

  findResizePolicies(filter: {
    templateVariantId?: string;
    templateId?: string;
  }): Promise<ResizePolicyVariantRecord[]>;
}
