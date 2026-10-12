import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 5 "Logical Sequence of
 * Words" (pages 17-21). Dictionary questions are sorted here, letters only and
 * case ignored, and the order written the way each question prints its
 * options. Logical-order questions are reasoned in words. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch05-logical-sequence.source.json
 */

const keyOf = (w: string) => w.toUpperCase().replace(/[^A-Z]/g, '');
const byDictionary = (a: string, b: string) => (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** The labels of `words` in dictionary order, joined as the options print them. */
function order(words: readonly string[], sep: string, labels: readonly string[] = words.map((_, i) => String(i + 1))): string {
  return words
    .map((w, i) => ({ w, label: labels[i] }))
    .sort((x, y) => byDictionary(x.w, y.w))
    .map((x) => x.label)
    .join(sep);
}
/** The word at a 1-based place in dictionary order (negative counts from the end). */
const place = (words: readonly string[], n: number) => {
  const s = [...words].sort(byDictionary);
  return n > 0 ? s[n - 1] : s[s.length + n];
};

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;
const reasoned = { kind: 'reasoned' } as const;
const DICTIONARY = (words: readonly string[]) => `Dictionary order: ${[...words].sort(byDictionary).join(', ')}.`;

const W3 = ['Decant', 'Decamp', 'Decade', 'Decagon', 'Decay'];
const W4 = ['Bandit', 'Banana', 'Bangle', 'Band', 'Bank'];
const W5 = ['TOPOLOGY', 'TOPIC', 'TOPAZ', 'TOUR', 'TORTILLA', 'TORN'];
const W6 = ['power', 'pour', 'powder', 'pointed', 'polite'];
const W7 = ['Marmatites', 'Martinec', 'Marijuana', 'Marehan', 'Marienbad'];
const W8 = ['Possibility', 'Possession', 'Posthumous', 'Posterity', 'Possessive'];
const W9 = ['Subsidiary', 'Subscribe', 'Substantiate', 'Substandard', 'Subsequent'];
const W10 = ['Dreamlike', 'Dreamer', 'Dreamy', 'Dreamland', 'Dreamtime'];
const W11 = ['Noble', 'Notable', 'Nomadic', 'Norway', 'Nostalgia'];
const W12 = ['Expense', 'Expensive', 'Expand', 'Expanded', 'Extra'];
const W13 = ['Neural', 'Newspaper', 'Neglect', 'Newfound', 'Neutron', 'Nephew'];
const W19 = ['Grouping', 'Grotesque', 'Grovel', 'Ground', 'Groundless'];
const W36 = ['Anywhere', 'Antipathy', 'Anticipation', 'Anyone', 'Antonym'];
const W37 = ['Hooter', 'Hoodlum', 'Hoover', 'Hoodwink', 'Hoop'];
const W38 = ['Literatre', 'Literature', 'Literacy', 'Literary', 'Literal'];
const W39 = ['Monocrystal', 'Monitoral', 'Monocular', 'Monsieur', 'Monochromist', 'Mongoose'];
const W40 = ['Fragile', 'Fracture', 'Fraud', 'Fragment', 'Fridge'];
const W41 = ['Profess', 'Product', 'Prosecute', 'Precaution', 'Proctor'];
const W42 = ['Dinner', 'Dimple', 'Dictation', 'Dictionary'];
const W43 = ['Crumble', 'Crop', 'Croatia', 'Crow', 'Crown'];
const W44 = ['Stubborn', 'Stalemate', 'Stocking', 'Straight', 'Stromy'];
const W45 = ['Onion', 'Owl', 'Omnious', 'Ostrich', 'Oxford'];
const W46 = ['Distrub', 'Distance', 'Distilled', 'Distribution', 'Distort'];
const W48 = ['Activity', 'Activist', 'Activismal', 'Activisticy', 'Activize'];
const W49 = ['Vantage', 'Wherefore', 'Uplift', 'Various', 'Variety', 'Valor'];
const W50 = ['Mathematic', 'Malfunction', 'Masterpiece', 'Manipulation', 'Manageable'];
const W51 = ['Hypocrisy', 'Hilarious', 'Humidity', 'Highlight', 'Hallucinate'];
const W52 = ['Perilous', 'Pessimist', 'Pedestrian', 'Perceive', 'Perfect', 'Peasant'];
const W53 = ['Exception', 'Exceptional', 'Exchanging', 'Exchanged', 'Excess'];
const W54 = ['Ferocious', 'Fervor', 'Fiction', 'Faith', 'Feign', 'Ferment'];
const W55 = ['Elate', 'Election', 'Elbow', 'Elastic', 'Electoral'];
const W56 = ['Kibble', 'Kennel', 'Kettle', 'Kicker', 'Kernel'];
const W57 = ['Method', 'Methanol', 'Metrics', 'Metro', 'Melody'];
const W58 = ['Piquant', 'Pierce', 'Patent', 'Perjury', 'Pasture'];
const W60 = ['Fustian', 'Funerary', 'Fusion', 'Funicular', 'Fuscous', 'Fundament', 'Fuselage'];
const W61 = ['Lesage', 'Laudatory', 'Laureate', 'Latitude', 'Legacy', 'Laudanum', 'Launder'];
const W62 = ['Junketeered', 'Junction', 'Junketers', 'Junketeering', 'Junctures'];
const W63 = ['Disaster', 'Disappointment', 'Discharge', 'Disappear', 'Disadvantage', 'Disarticulate'];
const W64 = ['Cadartrally', 'Caddisflies', 'Caducities', 'Caddisworms', 'Cadetships'];
const W66 = ['Cardiodynias', 'Cardiospasms', 'Carburetting', 'Carburettors', 'Carcinogenic'];
const W67 = ['Paleobiology', 'Pacifistically', 'Paleoecology', 'Pantomimically', 'Palletization'];
const W68 = ['Vaccillating', 'Vacationing', 'Vaccination', 'Vacuumising', 'Vacillatory'];
const W69 = ['haemostasis', 'haematite', 'haemoglobin', 'haemophilia'];
const W70 = ['Narcoanalyses', 'Narcotization', 'Narcoanalysis', 'Narrowcasting', 'Narrativizing'];
const W71 = ['Lamellosities', 'Lamellibranch', 'Lamprophonies', 'Lamprophanies', 'Laminectomies'];
const W72 = ['Tangleberries', 'Tangentiality', 'Tangibilities', 'Tangoreceptor', 'Tangentially'];
const W73 = ['Quarantine', 'Quadrangle', 'Quantifier', 'Quadruple', 'Quadriceps'];
const W74 = ['RAJRATNAM', 'PAJRATJMAM', 'RAJRATHNAM', 'RAJRATANAM', 'RAAJRATHNAM'];
const W75 = ['PRISTINE', 'PRINTER', 'PREVIOUS', 'PREVENT', 'PRIORITY'];
const W76 = ['Select', 'Seldom', 'Send', 'Selfish', 'Seller'];
const W77 = ['Protein', 'Problem', 'Proverb', 'Property', 'Project'];
const W78 = ['slunk', 'slung', 'slump', 'slum'];
const W79 = ['ROBBER', 'RANDOM', 'RESTRICT', 'RESTAURANT'];
const W80 = ['Plane', 'Plain', 'Plenty', 'Player'];
const W81 = ['Occulist', 'Odium', 'Odious', 'Ordeum'];
const W84 = ['Aaersid', 'Aaersted', 'Amquarine', 'Acgledhi', 'Acgledih'];
const W86 = ['Quilt', 'Quite', 'Queen', 'Queue'];
const W87 = ['Live', 'Litter', 'Little', 'Literacy', 'Living'];
const W88 = ['Telegraph', 'Telephone', 'Teleprinte', 'Telemetry', 'Telepathy'];
const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const PAREN = LETTERS.map((l) => `(${l})`);
const dict = (words: readonly string[], sep: string, labels?: readonly string[]) =>
  ({ key: '' as never, rule: DICTIONARY(words), check: computed(order(words, sep, labels)) }) as const;

export const AGRAWAL_CH05_LOGICAL_SEQUENCE: Readonly<Record<number, KeyEntry>> = {
  1: { held: true, reason: 'The print gives five options (A-E); the bank holds four. The dictionary order Recall, Recant, Receive, Recent, Recess puts Receive (B) third.', lean: 'B' },
  2: { held: true, reason: 'The print gives five options (A-E); the bank holds four. The dictionary order Slobber, Slouch, Slough, Sloven, Slow puts Slough (C) third.', lean: 'C' },
  3: { ...dict(W3, ', '), key: 'A', confidence: 'high' },
  4: { ...dict(W4, ', '), key: 'B', confidence: 'high' },
  5: { ...dict(W5, ', '), key: 'D', confidence: 'high' },
  6: { ...dict(W6, ', '), key: 'D', confidence: 'high' },
  7: { ...dict(W7, ', ', ROMAN), key: 'A', confidence: 'high' },
  8: { ...dict(W8, ', ', ROMAN), key: 'D', confidence: 'high' },
  9: { ...dict(W9, ', ', ROMAN), key: 'D', confidence: 'high' },
  10: { ...dict(W10, ' − '), key: 'C', confidence: 'high' },
  11: { ...dict(W11, ''), key: 'A', confidence: 'high' },
  12: { ...dict(W12, ''), key: 'B', confidence: 'high' },
  13: { ...dict(W13, ', '), key: 'C', confidence: 'high' },
  14: {
    key: 'C',
    confidence: 'medium',
    rule: 'The water cycle from the sea: Sea, Evaporation, Clouds, Rain.',
    note: 'A cycle has no first step: A (Evaporation, Clouds, Rain, Sea) is the same cycle started one step later. Read as starting from the sea. Check against the book key.',
    check: reasoned,
  },
  15: { key: 'B', confidence: 'high', rule: 'Smallest to largest: Town, City, District, State, Country.', check: reasoned },
  16: { key: 'A', confidence: 'high', rule: 'Smallest to largest: Drop, Puddle, Pond, River, Ocean.', check: reasoned },
  17: { key: 'B', confidence: 'high', rule: 'Smallest to largest: Letters, Words, Phrase, Sentence, Paragraph.', check: reasoned },
  18: { key: 'B', confidence: 'high', rule: 'Largest to smallest: Europe, Western Europe, Germany, Bavaria, Munich.', check: reasoned },
  19: { ...dict(W19, ', '), key: 'B', confidence: 'high' },
  20: { key: 'A', confidence: 'high', rule: 'Raw material, Material processing, Manufacturing, Distribution, Consumption.', check: reasoned },
  21: {
    key: 'B',
    confidence: 'high',
    rule: 'By longitude, east to west: Japan (~138° E), Malaysia (~102° E), India (~79° E), Uzbekistan (~64° E), Germany (~10° E), Canada (~106° W).',
    check: computed(
      ([['1', -106], ['2', 138], ['3', 79], ['4', 64], ['5', 10], ['6', 102]] as const)
        .slice()
        .sort((a, b) => b[1] - a[1])
        .map(([n]) => n)
        .join(', '),
    ),
  },
  22: { key: 'D', confidence: 'high', rule: 'Smallest to largest vehicle: Bicycle, Autorickshaw, Car, Bus, Train.', check: reasoned },
  23: { key: 'A', confidence: 'high', rule: 'Smallest to largest: Apartment, Building, City, State, Country.', check: reasoned },
  24: { key: 'A', confidence: 'high', rule: 'Along the arm from the tip: Nail, Finger, Wrist, Elbow, Shoulder.', check: reasoned },
  25: { key: 'B', confidence: 'high', rule: 'Stages of life: Foetus, Baby, Toddler, Adolescent, Adult.', check: reasoned },
  26: {
    key: 'C',
    confidence: 'high',
    rule: 'Smallest to largest prefix: Nano (10⁻⁹), Micro (10⁻⁶), Milli (10⁻³), Hecto (10²), Kilo (10³).',
    check: computed(([['1', -6], ['2', 2], ['3', -9], ['4', 3], ['5', -3]] as const).slice().sort((a, b) => a[1] - b[1]).map(([n]) => n).join(', ')),
  },
  27: { held: true, reason: 'Ocean is largest and Puddle smallest, but whether a lake or a river is bigger has no fixed answer: A (Ocean, Lake, River) and D (Ocean, River, Lake) differ only there.', lean: 'A' },
  28: { key: 'A', confidence: 'high', rule: 'Hiring in order: Application, Examination, Interview, Selection, Appointment.', check: reasoned },
  29: { key: 'A', confidence: 'high', rule: 'The food chain: Leaf, Caterpillar, Bird, Fox, Lion.', check: reasoned },
  30: { key: 'A', confidence: 'high', rule: 'Seed, Plant, Tree, Wood, Furniture.', check: reasoned },
  31: { key: 'D', confidence: 'high', rule: 'Sheep, Wool, Yarn, Garments, Shops.', check: reasoned },
  32: { key: 'B', confidence: 'high', rule: 'Seeds, Flowers, Nectar, Bees, Honey.', check: reasoned },
  33: { key: 'C', confidence: 'high', rule: 'Smallest to largest: Street, Village, Block, District, Province, Country.', check: reasoned },
  34: { key: 'B', confidence: 'high', rule: 'Washing clothes: Soak, Wash, Rinse, Dry, Iron.', check: reasoned },
  35: { key: 'B', confidence: 'high', rule: 'Smallest to largest: Bacteria, Mosquito, Butterfly, Sparrow, Vulture.', check: reasoned },
  36: { ...dict(W36, ', '), key: 'C', confidence: 'high' },
  37: { ...dict(W37, ', '), key: 'B', confidence: 'high' },
  38: { ...dict(W38, ', '), key: 'B', confidence: 'high' },
  39: { ...dict(W39, ', '), key: 'D', confidence: 'high' },
  40: { ...dict(W40, ', '), key: 'B', confidence: 'high' },
  41: { ...dict(W41, ', '), key: 'D', confidence: 'high' },
  42: { key: 'A', confidence: 'high', rule: `${DICTIONARY(W42)} Fourth: Dinner.`, check: computed(place(W42, 4)) },
  43: { key: 'A', confidence: 'high', rule: `${DICTIONARY(W43)} Third: Crow.`, check: computed(place(W43, 3)) },
  44: { key: 'C', confidence: 'high', rule: `${DICTIONARY(W44)} Second: Stocking.`, check: computed(place(W44, 2)) },
  45: { key: 'C', confidence: 'high', rule: `${DICTIONARY(W45)} Last: Oxford.`, check: computed(place(W45, -1)) },
  46: { key: 'B', confidence: 'high', rule: `${DICTIONARY(W46)} Last: Distrub (as printed).`, check: computed(place(W46, -1)) },
  47: { key: 'A', confidence: 'high', rule: 'Twice the number plus 4: 38 → 80, 42 → 88, so 29 → 62.', check: computed([38, 42].every((x, i) => 2 * x + 4 === [80, 88][i]) ? 2 * 29 + 4 : null) },
  48: { key: 'A', confidence: 'high', rule: `${DICTIONARY(W48)} Fourth: Activity.`, check: computed(place(W48, 4)) },
  49: { ...dict(W49, ', ', ROMAN), key: 'A', confidence: 'high' },
  50: { ...dict(W50, ', ', ROMAN), key: 'D', confidence: 'high' },
  51: { ...dict(W51, ', ', ROMAN), key: 'C', confidence: 'high' },
  52: { ...dict(W52, ', ', ROMAN), key: 'B', confidence: 'high' },
  53: { ...dict(W53, ''), key: 'A', confidence: 'high' },
  54: { ...dict(W54, ', '), key: 'B', confidence: 'high' },
  55: { ...dict(W55, ', '), key: 'C', confidence: 'high' },
  56: { ...dict(W56, ', '), key: 'D', confidence: 'high' },
  57: { ...dict(W57, ', '), key: 'D', confidence: 'high' },
  58: { ...dict(W58, ', '), key: 'B', confidence: 'high' },
  59: { held: true, reason: 'The question asks for "a logical and meaningful order" but gives single words as options and no list to order; it cannot be answered as printed.' },
  60: { ...dict(W60, ', '), key: 'A', confidence: 'high' },
  61: { ...dict(W61, ', '), key: 'D', confidence: 'high' },
  62: { ...dict(W62, ', ', ROMAN), key: 'A', confidence: 'high' },
  63: { ...dict(W63, ', ', ROMAN), key: 'D', confidence: 'high' },
  64: { ...dict(W64, ''), key: 'A', confidence: 'high' },
  65: { key: 'A', confidence: 'high', rule: 'Cotton, Thread, Fabric, Shirt Piece, Shirt.', check: reasoned },
  66: { ...dict(W66, ''), key: 'A', confidence: 'high' },
  67: { ...dict(W67, ''), key: 'B', confidence: 'high' },
  68: { ...dict(W68, ''), key: 'B', confidence: 'high' },
  69: { ...dict(W69, ''), key: 'D', confidence: 'high' },
  70: { ...dict(W70, ''), key: 'C', confidence: 'high' },
  71: { ...dict(W71, ''), key: 'A', confidence: 'high' },
  72: { ...dict(W72, ''), key: 'C', confidence: 'high' },
  73: { ...dict(W73, ''), key: 'D', confidence: 'high' },
  74: { held: true, reason: `${DICTIONARY(W74)} The middle name is RAJRATANAM (4), which is not an option.`, lean: 'B' },
  75: { ...dict(W75, ', ', PAREN), key: 'C', confidence: 'high' },
  76: { ...dict(W76, ', '), key: 'C', confidence: 'high' },
  77: { ...dict(W77, ', '), key: 'C', confidence: 'high' },
  78: { ...dict(W78, ', ', LETTERS), key: 'A', confidence: 'high' },
  79: { key: 'A', confidence: 'high', rule: `${DICTIONARY(W79)} Last: ROBBER.`, check: computed(place(W79, -1)) },
  80: { key: 'A', confidence: 'high', rule: `${DICTIONARY(W80)} Second: Plane.`, check: computed(place(W80, 2)) },
  81: { key: 'C', confidence: 'high', rule: `${DICTIONARY(W81)} Reversed, third: Odious.`, check: computed(place(W81, -3)) },
  82: { key: 'A', confidence: 'high', rule: 'The letters make CROWN: C 2, R 3, O 5, W 4, N 1.', check: computed([...'CROWN'].map((c) => 'NCRWO'.indexOf(c) + 1).join(', ')) },
  83: {
    key: 'D',
    confidence: 'high',
    rule: 'After the swaps the alphabet reads B A D C F E H G …; the seventh letter is H.',
    check: computed([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((_, i, a) => a[i ^ 1]).join('')[6]),
  },
  84: { ...dict(W84, ', ', PAREN), key: 'C', confidence: 'high' },
  85: { key: 'A', confidence: 'high', rule: 'A pairs with N, 13 places on, so K (11th) pairs with the 24th letter, X.', check: computed('ABCDEFGHIJKLMNOPQRSTUVWXYZ'['ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf('K') + 13]) },
  86: { ...dict(W86, ', '), key: 'D', confidence: 'high' },
  87: { ...dict(W87, ', '), key: 'D', confidence: 'high' },
  88: { ...dict(W88, ''), key: 'A', confidence: 'high' },
};
