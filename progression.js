const MAX_LEVEL = 30;
const BASE_HP = 35;
const HP_GAIN_PER_LEVEL = 5;
function getHpForLevel(level){ return BASE_HP + (Math.max(1, level) - 1) * HP_GAIN_PER_LEVEL; }
function getTierForLevel(level){ if(level <= 10) return "media"; return "dificil"; }
function buildStarterDeck(){ const deck=[]; STARTER_CARDS.forEach(card => { for(let i=0;i<card.copies;i++) deck.push(card.id); }); return deck; }
function buildDeckFromChoices(choiceIds){ const deck = buildStarterDeck(); (choiceIds || []).forEach(id => { const card = getCard(id); if(card){ for(let i=0;i<card.copies;i++) deck.push(card.id); }}); return deck; }
function getChoicePair(level, takenIds){ const tier = getTierForLevel(level); const available = LEVEL_POOL.filter(c => c.tier === tier && !takenIds.includes(c.id)); const shuffled = [...available].sort(() => Math.random() - 0.5); return shuffled.slice(0,2); }
