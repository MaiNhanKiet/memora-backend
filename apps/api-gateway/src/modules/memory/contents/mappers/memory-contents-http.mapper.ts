import type { UpdateCardContentsRequest, VerifiedActor } from '@app/contracts';
import type { UpdateCardContentsDto } from '../dto/memory-content.dto';

export function toUpdateCardContentsGrpcRequest(
  actor: VerifiedActor,
  cardId: string,
  body: UpdateCardContentsDto,
): UpdateCardContentsRequest {
  return {
    actor,
    cardId,
    items: body.items.map((item) => ({
      id: item.id,
      contentType: item.contentType,
      title: item.title,
      textContent: item.textContent,
      assetKey: item.assetKey,
      sortOrder: item.sortOrder,
      layoutJson: item.layoutJson,
    })),
  };
}
