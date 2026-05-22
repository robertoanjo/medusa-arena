const CARDS      = ['SHIELD', 'VEIL', 'MEDUSA'];
const MAX_ENERGY = 12;
const BEATS      = { SHIELD: 'MEDUSA', MEDUSA: 'VEIL', VEIL: 'SHIELD' };

function resolveCards(a, b) {
  if (a === b) return 'TIE';
  return BEATS[a] === b ? 'A' : 'B';
}

function randomCard() {
  return CARDS[Math.floor(Math.random() * CARDS.length)];
}

module.exports = { CARDS, MAX_ENERGY, BEATS, resolveCards, randomCard };
