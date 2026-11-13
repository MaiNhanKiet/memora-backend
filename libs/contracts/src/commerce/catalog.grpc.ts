// Contract gRPC của Commerce Catalog, khớp proto/commerce/v1/catalog.proto.

import type {
  GrpcPaginationRequest,
  PaginationMeta,
} from '../common/pagination';
import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

export interface ListTemplatesRequest {
  pagination?: GrpcPaginationRequest;
  gender?: string;
  search?: string;
}

export interface TemplateResponse {
  id: string;
  templateCode: string;
  name: string;
  description: string;
  gender: string;
  engraveSurfaceType: string;
  model3dAssetKey: string;
  glbUrl: string;
  mappingVersion: string;
  defaultMaterialId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTemplatesResponse {
  data: TemplateResponse[];
  pagination: PaginationMeta;
}

export interface GetTemplateByIdRequest {
  templateId: string;
}

// -----------------------------------------------------------------------------
// Materials
// -----------------------------------------------------------------------------

export interface ListMaterialsRequest {
  status?: string;
}

export interface MaterialResponse {
  id: string;
  materialCode: string;
  name: string;
  metalType: string;
  purityKarat: number;
  densityGCm3: number;
  status: string;
}

export interface ListMaterialsResponse {
  data: MaterialResponse[];
}

// -----------------------------------------------------------------------------
// Template Variants
// -----------------------------------------------------------------------------

export interface ListTemplateVariantsRequest {
  templateId: string;
  materialId?: string;
}

export interface TemplateVariantResponse {
  id: string;
  ringTemplateId: string;
  materialId: string;
  standardSize: number;
  maxUpDelta?: number;
  maxDownDelta?: number;
  resizeMethod?: string;
  addedMetalAllowed: boolean;
  localWallThicknessMm: number;
  minRemainingWallThicknessMm: number;
  maxSafeEngravingDepthMm: number;
  status: string;
}

export interface ListTemplateVariantsResponse {
  data: TemplateVariantResponse[];
}

// -----------------------------------------------------------------------------
// Gemstone Options
// -----------------------------------------------------------------------------

export interface ListGemstoneOptionsRequest {
  pagination?: GrpcPaginationRequest;
  stoneType?: string;
  shape?: string;
  isCertified?: boolean;
}

export interface GemstoneOptionResponse {
  id: string;
  stoneCode: string;
  stoneType: string;
  shape: string;
  cutGrade: string;
  color: string;
  clarity: string;
  caratWeight: number;
  dimensionLengthMm: number;
  dimensionWidthMm: number;
  dimensionHeightMm: number;
  isCertified: boolean;
  status: string;
}

export interface ListGemstoneOptionsResponse {
  data: GemstoneOptionResponse[];
  pagination: PaginationMeta;
}

// -----------------------------------------------------------------------------
// Gemstone Slots
// -----------------------------------------------------------------------------

export interface ListGemstoneSlotsRequest {
  templateId: string;
}

export interface GemstoneSlotResponse {
  id: string;
  ringTemplateId: string;
  slotNumber: number;
  slotType: string;
  gemstoneGroupId: string;
  anchorNodeName: string;
  isRequired: boolean;
}

export interface ListGemstoneSlotsResponse {
  data: GemstoneSlotResponse[];
}

// -----------------------------------------------------------------------------
// 3D Assets & Anchors
// -----------------------------------------------------------------------------

export interface GetTemplate3DAssetsRequest {
  templateId: string;
}

export interface AnchorNode {
  nodeName: string;
  slotNumber?: number;
  slotType?: string;
  surfaceType?: string;
}

export interface Template3DAssetsResponse {
  templateId: string;
  model3dAssetKey: string;
  glbUrl: string;
  mappingVersion: string;
  anchors: AnchorNode[];
}

// -----------------------------------------------------------------------------
// Configuration Options (Aggregated for 3D Configurator)
// -----------------------------------------------------------------------------

export interface GetTemplateConfigurationOptionsRequest {
  templateId: string;
}

export interface TemplateConfigurationOptionsResponse {
  templateId: string;
  availableMaterials: MaterialResponse[];
  availableVariants: TemplateVariantResponse[];
  gemstoneSlots: GemstoneSlotResponse[];
  allowedPersonalizationPackages: string[];
}

// -----------------------------------------------------------------------------
// Configuration Validation
// -----------------------------------------------------------------------------

export interface GemstoneSelection {
  slotNumber: number;
  gemstoneOptionId: string;
}

export interface ValidateConfigurationRequest {
  templateId: string;
  materialId: string;
  standardSize: number;
  targetSize: number;
  gemstoneSelections: GemstoneSelection[];
  personalizationPackage: string;
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
}

export interface ValidateConfigurationResponse {
  isValid: boolean;
  validationErrors: ValidationError[];
  templateVariantId: string;
  safeEngravingDepthMm: number;
  resizeDelta: number;
  isResizeAllowed: boolean;
}

// -----------------------------------------------------------------------------
// Service Interfaces
// -----------------------------------------------------------------------------

export interface CatalogServiceClient {
  listTemplates(
    request: ListTemplatesRequest,
    metadata?: Metadata,
  ): Observable<ListTemplatesResponse>;
  getTemplateById(
    request: GetTemplateByIdRequest,
    metadata?: Metadata,
  ): Observable<TemplateResponse>;
  getTemplateConfigurationOptions(
    request: GetTemplateConfigurationOptionsRequest,
    metadata?: Metadata,
  ): Observable<TemplateConfigurationOptionsResponse>;
  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
    metadata?: Metadata,
  ): Observable<Template3DAssetsResponse>;
  listMaterials(
    request: ListMaterialsRequest,
    metadata?: Metadata,
  ): Observable<ListMaterialsResponse>;
  listTemplateVariants(
    request: ListTemplateVariantsRequest,
    metadata?: Metadata,
  ): Observable<ListTemplateVariantsResponse>;
  listGemstoneOptions(
    request: ListGemstoneOptionsRequest,
    metadata?: Metadata,
  ): Observable<ListGemstoneOptionsResponse>;
  listGemstoneSlots(
    request: ListGemstoneSlotsRequest,
    metadata?: Metadata,
  ): Observable<ListGemstoneSlotsResponse>;
  validateConfiguration(
    request: ValidateConfigurationRequest,
    metadata?: Metadata,
  ): Observable<ValidateConfigurationResponse>;
}

export interface CatalogServiceHandler {
  listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse>;
  getTemplateById(request: GetTemplateByIdRequest): Promise<TemplateResponse>;
  getTemplateConfigurationOptions(
    request: GetTemplateConfigurationOptionsRequest,
  ): Promise<TemplateConfigurationOptionsResponse>;
  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<Template3DAssetsResponse>;
  listMaterials(request: ListMaterialsRequest): Promise<ListMaterialsResponse>;
  listTemplateVariants(
    request: ListTemplateVariantsRequest,
  ): Promise<ListTemplateVariantsResponse>;
  listGemstoneOptions(
    request: ListGemstoneOptionsRequest,
  ): Promise<ListGemstoneOptionsResponse>;
  listGemstoneSlots(
    request: ListGemstoneSlotsRequest,
  ): Promise<ListGemstoneSlotsResponse>;
  validateConfiguration(
    request: ValidateConfigurationRequest,
  ): Promise<ValidateConfigurationResponse>;
}
