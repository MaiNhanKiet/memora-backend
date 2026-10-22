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

export interface CatalogServiceHandler {
  listRingTemplates(
    request: ListRingTemplatesRequest,
  ): Promise<ListRingTemplatesResponse>;
}
