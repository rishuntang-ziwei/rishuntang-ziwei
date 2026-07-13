import { DECK } from './cards.js';
import { buildWuxingPanel, WUXING_COLORS, WUXING_ORDER } from '../../vendor/wuxing-panel.mjs';

export { WUXING_COLORS, WUXING_ORDER, buildWuxingPanel };

const CARD_BY_ID = new Map(
  Object.values(DECK).flatMap((tier) => tier.map((card) => [card.id, card])),
);

export function countElements(cards) {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  cards.forEach((card) => {
    const canonical = CARD_BY_ID.get(card.id) ?? card;
    const element = canonical.element?.trim();
    if (element && counts[element] !== undefined) {
      counts[element] += 1;
    }
  });
  return counts;
}
