import source from '../../../content/oir/agrawal-examcart/ch17-syllogism.source.json' with { type: 'json' };
import type { OptionLabel } from '../bank.ts';
import type { KeyEntry } from './key.ts';
import { pickOption, verdicts } from './syllogism.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 17 "Syllogism" (pages
 * 62-68). Each question's statements and conclusions are written formally
 * below ("all a b", "some a b", "no a b", "somenot a b", "few a b", "never a
 * b", "canall a b", "cansome a b"; see `syllogism.ts`), and the solver picks
 * the one printed option that says what follows. The file fails to load if no
 * option, or more than one, does. Every class named is taken to have members,
 * as the exam convention has it. Shipped with `key_basis = 'derived'` until
 * the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch17-syllogism.source.json
 */

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;
const optionsOf = (n: number) => source.questions[n - 1].options as Record<OptionLabel, string>;

/** A keyed syllogism: the solver's pick among the printed options. */
const syl = (n: number, key: OptionLabel, statements: string[], conclusions: string[], rule: string, note?: string): KeyEntry => ({
  key,
  confidence: note ? 'medium' : 'high',
  rule,
  ...(note ? { note } : {}),
  check: computed(pickFor(n, statements, conclusions)),
});

/** The solver's pick, naming the question when it finds no single option. */
function pickFor(n: number, statements: string[], conclusions: string[]): string {
  try {
    return pickOption(optionsOf(n), statements, conclusions);
  } catch (e) {
    throw new Error(`Q${n}: ${(e as Error).message}`);
  }
}

/** For a question whose options are themselves the conclusions: the one that follows. */
function onlyFollowing(n: number, statements: string[], formalOptions: Record<OptionLabel, string>): string | null {
  const labels = Object.keys(formalOptions) as OptionLabel[];
  const { follows } = verdicts(statements, labels.map((l) => formalOptions[l]));
  const hits = labels.filter((_, i) => follows[i]);
  return hits.length === 1 ? optionsOf(n)[hits[0]] : null;
}

export const AGRAWAL_CH17_SYLLOGISM: Readonly<Record<number, KeyEntry>> = {
  1: syl(1, 'C', ['some namkeen pizza', 'no pizza biscuit'], ['no biscuit namkeen', 'no biscuit pizza', 'somenot pizza biscuit'], 'II is statement 2 turned round; III holds because pizza exist and none is biscuit. The namkeen that are pizza are not biscuit, but others may be, so I does not follow.'),
  2: syl(2, 'A', ['all mtech engineers', 'all llm lawyers'], ['all lawyers llm', 'all engineers mtech'], 'An "all" does not turn round: lawyers need not be LLM students, nor engineers M. Tech students.'),
  3: syl(3, 'A', ['all scooters twowheelers', 'all bicycles twowheelers'], ['all scooters bicycles', 'all bicycles scooters'], 'Both are two wheelers, but that ties scooters to bicycles not at all.'),
  4: syl(4, 'A', ['all animals dogs', 'all dogs birds'], ['all animals birds', 'all birds animals'], 'Animals sit inside dogs, dogs inside birds: all animals are birds. The reverse does not follow.'),
  5: syl(5, 'A', ['some roads streets', 'some streets ways'], ['some roads ways', 'some ways roads'], 'Two "some" statements link nothing: the streets that are roads may not be the ones that are ways.'),
  6: syl(6, 'D', ['some linear quadratic', 'all quadratic algebraic'], ['all linear algebraic', 'some algebraic linear', 'some algebraic quadratic', 'all quadratic linear'], 'The linear equations that are quadratic are algebraic, so some algebraic are linear (II); quadratics exist and are all algebraic (III). I and IV claim too much.'),
  7: syl(7, 'D', ['some hills dunes', 'no dunes mountains'], ['some dunes hills', 'some mountains hills', 'all hills mountains'], 'I is statement 1 turned round. Nothing ties mountains to hills, and the hills that are dunes are not mountains, so III fails.'),
  8: syl(8, 'C', ['no cats monkeys', 'no monkeys cows'], ['no cats cows', 'some cows monkeys'], 'Two "no" statements say nothing about cats and cows; II contradicts statement 2.'),
  9: syl(9, 'D', ['few b q', 'few q v'], ['some b v', 'never q v'], 'Only a few Qs are Vs, so some Qs are not Vs: all Qs can never be Vs (II). Bs and Vs are not linked (I).'),
  10: syl(10, 'C', ['some mobiles videogames', 'all videogames remotes'], ['some mobiles remotes', 'some remotes mobiles'], 'The mobile phones that are video games are remote controls, so I and its turn-round II both follow.'),
  11: {
    key: 'C',
    confidence: 'high',
    rule: 'No tiger is an animal (tigers are humans, no human is an animal), so A, B and D fail. Tigers exist and all are humans, so some humans are tigers.',
    check: computed(onlyFollowing(11, ['all tigers humans', 'no humans animals'], { A: 'all tigers animals', B: 'some tigers animals', C: 'some humans tigers', D: 'some animals humans' })),
  },
  12: syl(12, 'A', ['all machines tools', 'no tools computers'], ['no machines computers', 'some computers tools'], 'Machines sit inside tools and no tool is a computer: no machine is a computer. II contradicts statement 2.'),
  13: syl(13, 'D', ['all birds sparrows', 'all sparrows reptiles'], ['some reptiles birds', 'all reptiles sparrows', 'all birds reptiles'], 'Birds sit inside sparrows inside reptiles: III, and so some reptiles are birds (I). II reverses an "all".'),
  14: syl(14, 'C', ['all beauticians architects', 'all architects cashiers'], ['some architects beauticians', 'some cashiers architects', 'some cashiers beauticians'], 'Beauticians sit inside architects inside cashiers; each "some" is an "all" turned round.'),
  15: syl(15, 'C', ['no bowlers batters', 'some bowlers fielders'], ['no fielders batters', 'no batters bowlers'], 'II is statement 1 turned round. Fielders that are not bowlers may be batters, so I does not follow.'),
  16: syl(16, 'D', ['all trees plants', 'some plants vines'], ['some plants trees', 'some trees vines'], 'I turns "all trees are plants" round. The plants that are vines need not be trees.'),
  17: syl(17, 'B', ['all eyes noses', 'some noses lips'], ['some noses eyes', 'all lips noses'], 'I turns "all eyes are noses" round. Only some lips are known to be noses.'),
  18: syl(18, 'C', ['all paintings calligraphics', 'all sketchings calligraphics'], ['some calligraphics paintings', 'no sketchings paintings'], 'Paintings exist and are all calligraphics: I. Sketching and painting may overlap, so II does not follow.'),
  19: syl(19, 'A', ['some vehicles helicopters', 'all helicopters cars'], ['all vehicles cars', 'some vehicles cars'], 'The vehicles that are helicopters are cars: II. Other vehicles need not be.'),
  20: syl(20, 'A', ['some tasks jobs', 'no jobs duties'], ['never tasks duties', 'some tasks duties'], 'The tasks that are jobs are not duties, so all tasks can never be duties (I). II is possible only.'),
  21: syl(21, 'C', ['all eyes noses', 'some noses lips'], ['some noses eyes', 'all lips noses'], 'As Q17: I turns the first statement round; II claims too much.'),
  22: syl(22, 'C', ['some carpenters singers', 'all singers doctors'], ['no doctors carpenters', 'some doctors singers', 'some carpenters doctors'], 'Singers exist and are doctors (II); the carpenters who sing are doctors (III), which rules out I.'),
  23: syl(23, 'D', ['some vegetables fruits', 'all potatoes vegetables'], ['all potatoes fruits', 'no potatoes fruits', 'all vegetables fruits', 'somenot vegetables fruits'], 'Nothing places potato among or outside the fruits, and only some vegetables are known to be fruits: none follows.'),
  24: syl(24, 'C', ['some skies blue', 'some blue soft'], ['some skies soft', 'some soft skies'], 'Two "some" statements link nothing.'),
  25: syl(25, 'A', ['all stars blue', 'all blue black'], ['some black stars', 'all black stars'], 'Stars sit inside blue inside black, so some black are stars; not all.'),
  26: syl(26, 'C', ['no cups plates', 'no plates spoons'], ['no cups spoons', 'some spoons cups'], 'Two "no" statements say nothing about cups and spoons. One of the two must be true, but neither follows, and no option offers either-or.'),
  27: syl(27, 'D', ['some whites yellows', 'all yellows blues'], ['some blues whites', 'some yellows whites'], 'The whites that are yellow are blue (I); II turns statement 1 round.'),
  28: syl(28, 'B', ['all reds pens', 'no pens whites'], ['no whites pens', 'no reds whites', 'all pens reds'], 'I turns statement 2 round; reds sit inside pens, so none is white (II). III reverses an "all".'),
  29: syl(29, 'C', ['some reds blues', 'some blues plates'], ['some reds plates', 'some plates reds', 'some plates blues'], 'III turns statement 2 round. Reds and plates are not linked.'),
  30: syl(30, 'A', ['all cups plates', 'all plates reds'], ['all cups reds', 'all plates cups', 'all reds plates'], 'Cups inside plates inside red: I. II and III reverse an "all".'),
  31: syl(31, 'A', ['all coals blacks', 'all blacks reds'], ['all coals reds', 'all reds coals', 'no reds coals'], 'Coal inside black inside red: I. II reverses it, and III contradicts it.'),
  32: syl(32, 'D', ['some pens cups', 'all cups plates'], ['all pens plates', 'no plates pens', 'all cups pens'], 'Only some pens are cups, so I claims too much; those pens are plates, so II is false; III reverses a "some".'),
  33: syl(33, 'D', ['some cups plates', 'no cups pencils'], ['no plates pencils', 'some plates pencils', 'some pencils cups'], 'Plates outside the cups may or may not be pencils; III contradicts statement 2.'),
  34: syl(34, 'C', ['all plates pens', 'some pens pencils'], ['all plates pencils', 'no plates pencils', 'some pencils pens'], 'III turns statement 2 round; plates and pencils are not linked.'),
  35: syl(35, 'A', ['all ears hands', 'no hands noses'], ['no ears noses', 'all noses ears', 'some hands noses'], 'Ears sit inside hands and no hand is a nose: I. II and III contradict that.'),
  36: syl(36, 'A', ['no boats ships', 'some ships rods'], ['no boats rods', 'some rods ships', 'somenot rods boats'], 'II turns statement 2 round; those rods are ships, so not boats (III). Other rods may be boats.'),
  37: syl(37, 'D', ['all bottles glasses', 'all glasses jugs'], ['all bottles jugs', 'all jugs bottles', 'some glasses bottles'], 'Bottles inside glasses inside jugs: I, and III turns the first "all" round. II reverses one.'),
  38: syl(38, 'A', ['all vehicles helicopters', 'some cars vehicles'], ['all cars helicopters', 'some helicopters vehicles', 'no cars helicopters'], 'Vehicles exist and are all helicopters: II. The cars that are vehicles are helicopters, so III fails; other cars may not be, so I fails.'),
  39: syl(39, 'C', ['some scissors spoons', 'all spoons plates'], ['some plates spoons', 'some spoons scissors', 'some plates scissors'], 'The scissors that are spoons are plates; each conclusion turns or chains that.'),
  40: syl(40, 'A', ['all books grapes', 'some grapes fruits'], ['no grapes books', 'some grapes books'], 'Books exist and are all grapes: II. I contradicts it.'),
  41: syl(41, 'D', ['all whites pinks', 'all greens pinks'], ['some pinks greens', 'some pinks whites'], 'Each turns an "all" round.'),
  42: syl(42, 'C', ['all schools pens', 'all books schools'], ['all books pens', 'all pens books'], 'Books inside schools inside pens: I. II reverses it.'),
  43: syl(43, 'A', ['all chains glasses', 'all glasses tables'], ['some glasses chains', 'some tables glasses'], 'Each turns an "all" round.'),
  44: syl(44, 'A', ['some fans hammers', 'all hammers fish'], ['no fans fish', 'some fans fish'], 'The fans that are hammers are fish: II. I contradicts it.'),
  45: syl(45, 'D', ['some jars mugs', 'some mugs pots'], ['some pots mugs', 'some pots jars'], 'I turns statement 2 round; jars and pots are not linked.'),
  46: syl(46, 'A', ['all bottles pens', 'some mugs bottles'], ['some mugs pens', 'all pens mugs'], 'The mugs that are bottles are pens: I. II claims too much.'),
  47: syl(47, 'A', ['some fans swords', 'all swords fish'], ['all fans fish', 'all swords fans'], 'Only some fans are known to be fish, and only some swords to be fans.'),
  48: syl(48, 'A', ['some pillows doors', 'some doors beds'], ['some doors pillows', 'all beds doors'], 'I turns statement 1 round; II claims too much.'),
  49: syl(49, 'A', ['no j r', 'no r c'], ['all j c', 'some r j', 'all c r'], 'Two "no" statements say nothing of J and C; II and III contradict the statements.'),
  50: syl(50, 'C', ['some jungles greens', 'no blues greens'], ['no greens blues', 'some greens jungles', 'no jungles blues'], 'I and II turn the statements round. Jungle outside green may be blue, so III does not follow.'),
  51: syl(51, 'A', ['no mountains deserts', 'some deserts sandy', 'somenot sandy mountains'], ['somenot deserts mountains', 'some sandy mountains'], 'Deserts exist and none is a mountain: I. Nothing makes sandy places mountains.'),
  52: syl(52, 'D', ['all bicycles wheels', 'some bicycles vehicles', 'somenot vehicles tyres'], ['some bicycles tyres', 'somenot wheels vehicles'], 'Nothing places bicycles among tyres, and every wheel may be a vehicle.'),
  53: syl(53, 'C', ['some phones laptops', 'some laptops tablets', 'some tables desktops'], ['some phones desktops', 'all tablets phones'], '"Some" statements in a chain link nothing.', 'Statement 3 prints "tables", likely for "tablets"; either way nothing follows.'),
  54: syl(54, 'D', ['no powders lipsticks', 'all lipsticks creams', 'no creams lotions'], ['no lipsticks lotions', 'no powders creams'], 'Lipsticks sit inside creams and no cream is a lotion: I. Powders outside lipsticks may be creams.'),
  55: syl(55, 'A', ['all cats dogs', 'some dogs elephants', 'all elephants camels'], ['all cats elephants', 'some cats elephants', 'some elephants dogs', 'some camels dogs'], 'III turns statement 2 round; those dogs are camels, so IV. Cats and elephants are not linked.'),
  56: syl(56, 'C', ['all drinks shakes', 'all teas shakes', 'all shakes coffees'], ['all coffees teas', 'all coffees drinks', 'some coffees shakes'], 'Shakes sit inside coffee: III. I and II reverse "all"s.'),
  57: syl(57, 'C', ['all masks sanitizers', 'all handwashes sanitizers', 'all sanitizers medicines'], ['all handwashes medicines', 'all medicines masks', 'some medicines handwashes'], 'Handwashes inside sanitizers inside medicines: I, and III turns it round. II reverses an "all".'),
  58: syl(58, 'B', ['all apples bananas', 'all grapes bananas', 'all bananas plums'], ['all apples plums', 'all grapes plums', 'some grapes bananas'], 'Apples and grapes sit inside bananas inside plums: I and II; III is part of statement 2.'),
  59: syl(59, 'A', ['all boxes pans', 'some boxes jugs', 'some jugs glasses'], ['some glasses boxes', 'no glasses boxes', 'some jugs pans'], 'The jugs that are boxes are pans: III. Glasses and boxes are not linked; one of I and II must be true, but no option offers III with either-or.'),
  60: syl(60, 'A', ['all mirrors combs', 'all clips combs', 'all combs brushes'], ['all clips brushes', 'all mirrors brushes', 'some brushes clips'], 'Mirrors and clips sit inside combs inside brushes; III turns I round.'),
  61: syl(61, 'A', ['all flowers leaves', 'all leaves stems', 'some stems roots'], ['some stems leaves', 'some flowers roots', 'some leaves flowers'], 'I and III turn "all"s round. The stems that are roots need not be flowers.'),
  62: syl(62, 'B', ['all chocolates biscuits', 'all chips biscuits', 'all biscuits potatoes'], ['all chips potatoes', 'all potatoes chocolates', 'some potatoes chips'], 'Chips inside biscuits inside potatoes: I, and III turns it round. II reverses an "all".', 'III prints "Some potatoes the chips", read as "are".'),
  63: syl(63, 'A', ['no keys phones', 'all keys clips', 'some keys tables'], ['somenot clips phones', 'somenot tables phones', 'some clips tables'], 'Keys are clips and not phones: I. The tables that are keys are clips (III) and not phones (II).'),
  64: syl(64, 'A', ['some beans potatoes', 'all carrots potatoes', 'all gourds potatoes'], ['some gourds beans', 'some carrots gourds', 'some potatoes gourds'], 'III turns statement 3 round. Gourds, carrots and beans are not linked to each other.'),
  65: syl(65, 'D', ['all boys tomatoes', 'some tomatoes ladders', 'no ladders smalls'], ['somenot boys tomatoes', 'somenot ladders tomatoes', 'some boys ladders'], 'I contradicts statement 1; every ladder may be a tomato; boys and ladders are not linked.'),
  66: syl(66, 'B', ['all pillows beds', 'some beds cupboards', 'all cupboards woods'], ['some beds pillows', 'some cupboards beds', 'all woods cupboards'], 'I and II turn statements round; III reverses an "all".'),
  67: syl(67, 'A', ['all cats rats', 'some rats whites', 'all whites milks'], ['some rats cats', 'some whites rats', 'some milks whites'], 'Each conclusion turns a statement round.'),
  68: syl(68, 'B', ['all stems leaves', 'all fruits leaves', 'all leaves trunks'], ['all fruits trunks', 'all trunks stems', 'some trunks fruits'], 'Fruits inside leaves inside trunks: I, and III turns it round. II reverses an "all".'),
  69: syl(69, 'C', ['all tubes pipes', 'all switches pipes', 'all pipes boards'], ['all switches boards', 'all boards tubes', 'some boards switches'], 'Switches inside pipes inside boards: I and III. II reverses an "all".'),
  70: syl(70, 'C', ['all waters inks', 'all glues inks', 'all inks pens'], ['all glues pens', 'all pens waters', 'some pens glues'], 'Glues inside inks inside pens: I and III. II reverses an "all".'),
  71: syl(71, 'A', ['all pencils woods', 'some woods notes', 'some diaries woods'], ['some notes diaries', 'some woods pencils', 'some diaries woods'], 'II turns statement 1 round; III repeats statement 3. Notes and diaries are not linked.'),
  72: syl(72, 'C', ['all beds tables', 'all cots tables', 'all tables taps'], ['all cots taps', 'some taps beds', 'some taps cots'], 'Beds and cots sit inside tables inside taps; II and III turn that round.'),
  73: syl(73, 'A', ['some trees fishes', 'all fishes goats', 'no goats flowers'], ['some trees goats', 'somenot fishes flowers', 'somenot flowers goats'], 'The trees that are fishes are goats (I); fishes are goats, never flowers (II); flowers exist and none is a goat (III).'),
  74: syl(74, 'C', ['all fields gardens', 'all gardens parks', 'some gardens apartments'], ['some apartments parks', 'all fields parks'], 'The apartments that are gardens are parks (I); fields sit inside gardens inside parks (II).'),
  75: syl(75, 'A', ['all camels fractals', 'no fractals tubes', 'all pianos camels'], ['some tubes camels', 'no pianos tubes'], 'Pianos inside camels inside fractals, none a tube: II. I contradicts that.'),
  76: syl(76, 'A', ['all bangles coins', 'all coins anklets', 'all anklets lockets'], ['all lockets bangles', 'some lockets coins'], 'Coins sit inside lockets, so some lockets are coins. I reverses the chain.'),
  77: syl(77, 'B', ['all tables woods', 'all woods paints', 'no paints steels'], ['canall steels woods', 'some paints steels'], 'Woods are paints and no paint is steel, so no steel can be a wood (1 fails) and 2 contradicts statement 3.'),
  78: syl(78, 'A', ['some watches clocks', 'all clocks blacks', 'all blacks bigs'], ['some watches bigs', 'some watches blacks'], 'The watches that are clocks are black, and so big: both.'),
  79: syl(79, 'B', ['some chairs bedsheets', 'all cots chairs', 'all pillows bedsheets'], ['some pillows chairs', 'some cots bedsheets'], 'The chairs that are bedsheets need not be cots or pillows: neither.'),
  80: syl(80, 'D', ['some raisins grapes', 'all grapes apples', 'all raisins fruits'], ['some fruits apples', 'some apples raisins'], 'The raisins that are grapes are apples (II) and fruits, so some fruits are apples (I).'),
  81: syl(81, 'B', ['some trains buses', 'no buses cars', 'some cars bikes'], ['some bikes cars', 'some bikes trains'], 'I turns statement 3 round. Trains and bikes are not linked.'),
  82: syl(82, 'D', ['all doors walls', 'all walls rooms', 'all rooms flats'], ['some flats doors', 'all walls flats'], 'Doors inside walls inside rooms inside flats: both.', 'Both conclusions print as "I."; the second is read as II, as the options name it.'),
  83: syl(83, 'A', ['all notebooks pinks', 'all pinks shirts', 'some shirts trousers'], ['all trousers notebooks', 'some trousers pinks'], 'The shirts that are trousers need not be pink or notebooks.'),
  84: syl(84, 'C', ['all bottles bags', 'some bags pencils', 'some pencils sharpeners'], ['some sharpeners bottles', 'some bottles pencils'], 'The bags that are pencils need not be bottles: neither.'),
  85: syl(85, 'B', ['some beds chairs', 'all chairs tables', 'all tables towels'], ['some towels beds', 'some tables beds'], 'The beds that are chairs are tables and so towels: both.'),
  86: syl(86, 'D', ['some goats tires', 'all roads tires', 'some cars roads'], ['some cars tires', 'all goats cars'], 'The cars that are roads are tires: I. II claims too much.'),
  87: syl(87, 'B', ['some lawyers doctors', 'some doctors players', 'all players engineers'], ['some players doctors', 'some engineers lawyers', 'all lawyers engineers', 'some engineers doctors'], 'I turns statement 2 round; those doctors are players and so engineers (IV). Lawyers and engineers are not linked.'),
  88: syl(
    88,
    'D',
    ['all coaching children', 'all children classv', 'some children coaching', 'some children brilliant'],
    ['all coaching brilliant', 'all coaching classv', 'no children brilliant'],
    'Every child studies in class V, so the children at coaching do (II). Only some children are brilliant (I fails), and some are, so III fails.',
    '"Children who go to coaching" is read as a class within the children, and "all children who study in class V are not brilliant" as "no child is brilliant".',
  ),
  89: syl(89, 'B', ['no k l', 'some l m', 'all m g'], ['some g l', 'some m l', 'no l k'], 'II and III turn statements round; the Ls that are M are G, so I.'),
  90: syl(90, 'B', ['all tables chairs', 'some chairs foldables', 'all foldables beds'], ['all beds chairs', 'all tables foldables'], 'The chairs that fold need not be tables, and beds need not be chairs: neither.'),
  91: syl(91, 'A', ['all capsicums chilies', 'all chilies cucumbers', 'all cucumbers gourds'], ['some cucumbers capsicums', 'all gourds capsicums', 'all chilies gourds'], 'Capsicums inside chilies inside cucumbers inside gourds: I and III. II reverses the chain.'),
  92: {
    held: true,
    reason: 'Iron sits inside zinc and no gold is zinc, so no iron is gold: II follows on its own and I cannot be true. No printed option says "only II"; the book likely means the either-or (C), which the statements do not support.',
    lean: 'C',
  },
  93: syl(93, 'D', ['all ladders tables', 'some tables chairs', 'all chairs furnitures'], ['some furnitures ladders', 'all tables furnitures'], 'The tables that are chairs need not be ladders, and other tables need not be furniture: neither.'),
};
