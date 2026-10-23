// Contract gRPC của Catalog, khớp proto/catalog/v1/catalog.proto.

export interface ListRingTemplatesRequest {
  stoneLayout?: string;
  package?: string;
  limit?: number;
  offset?: number;
}

export interface RingTemplateSummaryMessage {
  id: string;
  code: string;
  name: string;
  description?: string;
  glbAssetKey: string;
  stoneLayout: string;
  designSupportedPersonalizationPackages: string[];
  status: string;
}

export interface ListRingTemplatesResponse {
  items: RingTemplateSummaryMessage[];
  total: number;
}

export interface GetRingTemplateDetailRequest {
  templateId: string;
}

export interface RingTemplateDetailMessage {
  id: string;
  code: string;
  name: string;
  description?: string;
  glbAssetKey: string;
  stoneLayout: string;
  designSupportedPersonalizationPackages: string[];
  thetaMinDeg?: number;
  thetaMaxDeg?: number;
  vMinMm?: number;
  vMaxMm?: number;
  boundaryJson?: string;
  forbiddenZonesJson?: string;
  placementToleranceMm?: number;
  status: string;
}

export interface GetRingTemplateDetailResponse {
  template: RingTemplateDetailMessage;
}

export interface GetConfigurationOptionsRequest {
  templateId: string;
}

export interface TemplateVariantOptionMessage {
  id: string;
  materialId: string;
  standardSize: number;
  localWallThicknessMm: number;
  maxSafeEngravingDepthMm: number;
  status: string;
}

export interface MaterialOptionMessage {
  id: string;
  code: string;
  name: string;
  materialFamily?: string;
  purityPercent?: number;
  color?: string;
}

export interface GemstoneSlotOptionMessage {
  id: string;
  slotIndex: number;
  code: string;
  glbNodeName: string;
}

export interface GemstoneGroupOptionMessage {
  id: string;
  code: string;
  name?: string;
  selectionMode: string;
  isRequired: boolean;
  sequenceNo: number;
  slots: GemstoneSlotOptionMessage[];
}

export interface GemstoneOptionItemMessage {
  id: string;
  code: string;
  name: string;
  stoneType: string;
  shape: string;
  lengthMm: number;
  widthMm: number;
  colorGrade?: string;
  clarityGrade?: string;
  certifiedRequired: boolean;
  compatibleGroupIds: string[];
}

export interface GetConfigurationOptionsResponse {
  variants: TemplateVariantOptionMessage[];
  materials: MaterialOptionMessage[];
  gemstoneGroups: GemstoneGroupOptionMessage[];
  compatibleGemstones: GemstoneOptionItemMessage[];
}

export interface GetTemplate3DAssetsRequest {
  templateId: string;
}

export interface TemplateSlotAnchorMessage {
  slotId: string;
  groupId: string;
  slotIndex: number;
  slotCode: string;
  glbNodeName: string;
}

export interface TemplateEngraveSurfaceMessage {
  thetaMinDeg?: number;
  thetaMaxDeg?: number;
  vMinMm?: number;
  vMaxMm?: number;
  boundaryJson?: string;
  forbiddenZonesJson?: string;
  placementToleranceMm?: number;
}

export interface GetTemplate3DAssetsResponse {
  templateId: string;
  glbAssetKey: string;
  engraveSurface?: TemplateEngraveSurfaceMessage;
  slotAnchors: TemplateSlotAnchorMessage[];
}

export interface CatalogServiceHandler {
  listRingTemplates(
    request: ListRingTemplatesRequest,
  ): Promise<ListRingTemplatesResponse>;
  getRingTemplateDetail(
    request: GetRingTemplateDetailRequest,
  ): Promise<GetRingTemplateDetailResponse>;
  getConfigurationOptions(
    request: GetConfigurationOptionsRequest,
  ): Promise<GetConfigurationOptionsResponse>;
  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<GetTemplate3DAssetsResponse>;
}

