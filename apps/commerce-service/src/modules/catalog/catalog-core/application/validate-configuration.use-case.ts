import { Inject, Injectable } from '@nestjs/common';
import type {
  ValidateConfigurationRequest,
  ValidateConfigurationResponse,
  ValidationError,
} from '@app/contracts';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './catalog.repository';
import { validateGemstoneSlotSelections } from './gemstone-selection.validation';

@Injectable()
export class ValidateConfigurationUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
    request: ValidateConfigurationRequest,
  ): Promise<ValidateConfigurationResponse> {
    const validationErrors: ValidationError[] = [];

    const template = await this.repository.findTemplateById(request.templateId);
    if (!template || template.status !== 'ACTIVE') {
      validationErrors.push({
        code: 'TEMPLATE_INVALID',
        message: `Template ${request.templateId} is not found or not active`,
        field: 'templateId',
      });
      return {
        isValid: false,
        validationErrors,
        templateVariantId: '',
        safeEngravingDepthMm: 0,
        resizeDelta: 0,
        isResizeAllowed: false,
      };
    }

    const variant = await this.repository.findVariantByTemplateMaterialAndSize(
      request.templateId,
      request.materialId,
      request.standardSize,
    );

    if (!variant) {
      validationErrors.push({
        code: 'VARIANT_NOT_FOUND',
        message: `No active variant found for template ${request.templateId}, material ${request.materialId}, standardSize ${request.standardSize}`,
        field: 'standardSize',
      });
      return {
        isValid: false,
        validationErrors,
        templateVariantId: '',
        safeEngravingDepthMm: 0,
        resizeDelta: 0,
        isResizeAllowed: false,
      };
    }

    const resizeDelta = request.targetSize - request.standardSize;
    const maxUp = variant.maxUpDelta ?? 0;
    const maxDown = variant.maxDownDelta ?? 0;

    let isResizeAllowed = true;
    if (resizeDelta > 0 && resizeDelta > maxUp) {
      isResizeAllowed = false;
      validationErrors.push({
        code: 'RESIZE_OUT_OF_BOUNDS',
        message: `Target size ${request.targetSize} exceeds max up delta ${maxUp} for standard size ${request.standardSize}`,
        field: 'targetSize',
      });
    } else if (resizeDelta < 0 && Math.abs(resizeDelta) > maxDown) {
      isResizeAllowed = false;
      validationErrors.push({
        code: 'RESIZE_OUT_OF_BOUNDS',
        message: `Target size ${request.targetSize} exceeds max down delta ${maxDown} for standard size ${request.standardSize}`,
        field: 'targetSize',
      });
    }

    const selections = request.gemstoneSelections ?? [];
    const [slots, compatibilities] = await Promise.all([
      this.repository.findGemstoneSlotsByTemplateId(request.templateId),
      selections.length
        ? this.repository.findCompatibilities(
            variant.id,
            selections.map(({ gemstoneOptionId }) =>
              gemstoneOptionId.toLowerCase(),
            ),
          )
        : [],
    ]);
    validationErrors.push(
      ...validateGemstoneSlotSelections(slots, compatibilities, selections)
        .errors,
    );

    const allowedPackages =
      template.designSupportedPersonalizationPackages.length > 0
        ? template.designSupportedPersonalizationPackages
        : ['NONE'];
    if (
      request.personalizationPackage &&
      !allowedPackages.includes(request.personalizationPackage)
    ) {
      validationErrors.push({
        code: 'PERSONALIZATION_NOT_SUPPORTED',
        message: `Personalization package '${request.personalizationPackage}' is not supported by template`,
        field: 'personalizationPackage',
      });
    }

    return {
      isValid: validationErrors.length === 0,
      validationErrors,
      templateVariantId: variant.id,
      safeEngravingDepthMm: variant.maxSafeEngravingDepthMm,
      resizeDelta,
      isResizeAllowed,
    };
  }
}
