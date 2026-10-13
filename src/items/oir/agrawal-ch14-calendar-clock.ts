import { facingName } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 14 "Calender [sic] and
 * Clock" (pages 53-54). A real date's weekday is read from the calendar
 * (`Date.UTC`, the Gregorian calendar the questions use); a weekday counted
 * from another is taken mod 7; a clock angle is |30h − 5.5m|; a dial turned to
 * face a compass point keeps its clockwise order. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch14-calendar-clock.source.json
 */

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
type Day = (typeof DAYS)[number];

/** The weekday of a real date. */
const weekday = (y: number, m: number, d: number): Day => DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
/** The weekday `n` days after (or before, negative) `day`. */
const after = (day: Day, n: number): Day => DAYS[(((DAYS.indexOf(day) + n) % 7) + 7) % 7];
/** Days from one real date to another. */
const between = (a: readonly [number, number, number], b: readonly [number, number, number]) =>
  (Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000;
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The smaller angle between the hands at h:m. */
const angle = (h: number, m: number) => ((d) => Math.min(d, 360 - d))(Math.abs(30 * (h % 12) - 5.5 * m));
/** A number of degrees as the book prints it: 37·5°, 197½°. */
const deg = (x: number, half: '·5' | '½' = '½') => `${Math.floor(x)}${x % 1 ? half : ''}°`;

/** Clock time in minutes from midnight, as the book prints it ("12.48 P.M.", "3 : 20 PM"). */
function clock(minutes: number, style: 'dot' | 'colon', ampm: 'AM' | 'am' | 'A.M.'): string {
  const t = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(t / 60);
  const h = h24 % 12 || 12;
  const pm = h24 >= 12;
  const suffix = ampm === 'A.M.' ? (pm ? 'P.M.' : 'A.M.') : ampm === 'AM' ? (pm ? 'PM' : 'AM') : pm ? 'pm' : 'am';
  return `${h}${style === 'dot' ? '.' : ':'}${String(t % 60).padStart(2, '0')} ${suffix}`;
}
const at = (h: number, m = 0) => h * 60 + m;

/**
 * A clock face turned so that dial position `p` (in hours) faces bearing `b`:
 * clockwise round the dial is clockwise round the compass, 30° an hour.
 */
const dialBearing = (p: number, b: number) => (q: number) => b + 30 * (q - p);

export const AGRAWAL_CH14_CALENDAR_CLOCK: Readonly<Record<number, KeyEntry>> = {
  1: { key: 'C', confidence: 'high', rule: 'The 30th is 22 days after the 8th: 22 = 3 weeks + 1 day, so Monday + 1 = Tuesday.', check: computed(after('Monday', 30 - 8)) },
  2: { key: 'C', confidence: 'high', rule: '2008 is a leap year: 26, 27, 28, 29 February, 1 and 2 March make 6 days. Monday + 6 = Sunday.', check: computed(after('Monday', between([2008, 2, 25], [2008, 3, 2]))) },
  3: { key: 'A', confidence: 'high', rule: '19 November 2053 falls on a Wednesday.', check: computed(weekday(2053, 11, 19)) },
  4: { key: 'D', confidence: 'high', rule: '10 October 2021 fell on a Sunday.', check: computed(weekday(2021, 10, 10)) },
  5: { key: 'C', confidence: 'high', rule: '17 November 1855 fell on a Saturday.', check: computed(weekday(1855, 11, 17)) },
  6: { key: 'A', confidence: 'high', rule: '15 April 2029 falls on a Sunday.', check: computed(weekday(2029, 4, 15)) },
  7: {
    key: 'A',
    confidence: 'medium',
    rule: '380 days after Friday 21 January 2022 is 5 February 2023: 380 = 54 weeks + 2 days, so Friday + 2 = Sunday.',
    note: 'Read as 380 days after the purchase. Counting the purchase day as the first day gives Saturday, also an option. Check against the book key.',
    check: computed(after(weekday(2022, 1, 21), 380)),
  },
  8: { key: 'D', confidence: 'high', rule: '9 March 2002 fell on a Saturday.', check: computed(weekday(2002, 3, 9)) },
  9: { key: 'D', confidence: 'high', rule: '31 January 2009 fell on a Saturday.', check: computed(weekday(2009, 1, 31)) },
  10: { key: 'D', confidence: 'high', rule: '22 February 2012 fell on a Wednesday.', check: computed(weekday(2012, 2, 22)) },
  11: { key: 'A', confidence: 'high', rule: 'The 30th is 20 days after the 10th: 2 weeks + 6 days, so Tuesday + 6 = Monday.', check: computed(after('Tuesday', 30 - 10)) },
  12: { key: 'B', confidence: 'high', rule: 'April has 30 days: 30 = 4 weeks + 2 days, so Wednesday + 2 = Friday.', check: computed(after('Wednesday', 30)) },
  13: { key: 'A', confidence: 'high', rule: '15 August 2021 fell on a Sunday.', check: computed(weekday(2021, 8, 15)) },
  14: {
    held: true,
    reason: "Born 20 days after 4 December is 24 December, 40 days after Children's Day (14 November, a Thursday): a Tuesday, not among the options. No other reading found lands on one.",
  },
  15: { key: 'D', confidence: 'high', rule: '15 August is 201 days after 26 January in 2017: 28 weeks + 5 days, so Thursday + 5 = Tuesday.', check: computed(after('Thursday', between([2017, 1, 26], [2017, 8, 15]))) },
  16: {
    key: 'B',
    confidence: 'high',
    rule: '2012 is a leap year starting on Sunday. Of the options only 2040 is a leap year that starts on Sunday.',
    check: computed(['2020', '2040', '2025', '2031'].filter((y) => isLeap(+y) && weekday(+y, 1, 1) === weekday(2012, 1, 1)).join() || null),
  },
  17: { key: 'C', confidence: 'high', rule: 'Three days before today is Saturday + 3 = Tuesday, so today is Friday.', check: computed(after(after('Saturday', 3), 3)) },
  18: {
    key: 'A',
    confidence: 'high',
    rule: 'The 5th is Tuesday, so the 1st is Friday and the Fridays are 1, 8, 15. Three days after the 15th is the 18th.',
    check: computed(((first) => first + 14 + 3)([1, 2, 3, 4, 5, 6, 7].find((d) => after('Tuesday', d - 5) === 'Friday')!)),
  },
  19: { key: 'B', confidence: 'high', rule: 'Friday + 8 days = Saturday.', check: computed(after('Friday', 8)) },
  20: { key: 'D', confidence: 'high', rule: 'Thursday + 9 days = Saturday.', check: computed(after('Thursday', 9)) },
  21: {
    key: 'D',
    confidence: 'medium',
    rule: 'At 6:15 the minute hand is on the 3, so 3 faces North and 12 faces West. The 11 is 30° anticlockwise of 12: towards South-West.',
    note: 'The 11 lies 30° from West, not 45°; South-West is the nearest of the four options. Check against the book key.',
    check: computed(facingName(Math.round(dialBearing(3, 0)(11) / 45) * 45)),
  },
  22: {
    key: 'D',
    confidence: 'medium',
    rule: '15 steps leave one girl: 15 × 2 = 30 minutes, with an interval after the 5th and 10th steps (the game ends at the 15th): 30 + 10 = 40.',
    note: 'Read with no interval after the last step; counting one there gives 45, also an option. Check against the book key.',
    check: computed(`${(16 - 1) * 2 + 5 * Math.floor((16 - 2) / 5)} minutes`),
  },
  23: {
    held: true,
    reason: 'No time has its hands where swapping them reads 6:23, so the question has no exact answer; the options sit near 4:32 only by rounding, and which one the book meant cannot be told.',
  },
  24: { key: 'C', confidence: 'high', rule: 'In 30 minutes the hand turns 9 × 30 = 270°, which is 45 minutes of dial. It gains 15 minutes.', check: computed(`${(9 * 30) / 6 - 30} minutes`) },
  25: {
    key: 'D',
    confidence: 'high',
    rule: 'The clock shows 29 hours while 29 × 24 ÷ 24⅙ = 28.8 hours pass: 8 A.M. Monday + 28 h 48 min = 12.48 P.M. Tuesday.',
    check: computed(clock(at(8) + Math.round(29 * 60 * (24 * 60) / (24 * 60 + 10)), 'dot', 'A.M.')),
  },
  26: { key: 'B', confidence: 'high', rule: 'The last flight left at 10:20 A.M.; five hours later is 3:20 PM.', check: computed(clock(at(10, 45) - 25 + 5 * 60, 'colon', 'AM')) },
  27: {
    key: 'C',
    confidence: 'high',
    rule: 'x minutes before noon is 120 − x past 10; nine minutes earlier it was 111 − x = 2x past 10, so x = 37.',
    check: computed([23, 47, 37, 17].filter((x) => 120 - x - 9 === 2 * x).join() || null),
  },
  28: { key: 'A', confidence: 'high', rule: 'He arrived at 10:50, after 30 minutes on the way: he left at 10.20 AM.', check: computed(clock(at(10, 45) + 5 - 30, 'dot', 'AM')) },
  29: { key: 'A', confidence: 'high', rule: '1 is C, so 8 is seven letters on: J.', check: computed(String.fromCharCode('C'.charCodeAt(0) + 8 - 1)) },
  30: { key: 'A', confidence: 'high', rule: 'From 3:36 to 6:00 is 144 minutes; the hour hand turns ½° a minute: 72°.', check: computed((at(6) - at(3, 36)) / 2) },
  31: { key: 'C', confidence: 'high', rule: 'The last bell rang 45 minutes before 7:45, at 7:00; five minutes later is 7:05 am.', check: computed(clock(at(7, 45) - 45 + 5, 'colon', 'am')) },
  32: {
    key: 'D',
    confidence: 'high',
    rule: 'The 6 faces North, so going clockwise the 9 faces East, the 12 South and the 3 West. At 9:15 the minute hand is on the 3: West.',
    check: computed(facingName(dialBearing(6, 0)(3))),
  },
  33: {
    key: 'C',
    confidence: 'high',
    rule: 'At 7:30 the minute hand is on the 6, facing West. The hour hand, halfway between 7 and 8, is 45° clockwise of it: North-West.',
    check: computed(({ 'North-West': 'N − W', 'North-East': 'N − E', 'South-West': 'S − W', North: 'North' } as Record<string, string>)[facingName(dialBearing(6, 270)(7.5)) ?? ''] ?? null),
  },
  34: { key: 'C', confidence: 'high', rule: '30 May is 22 + 30 = 52 days after 8 April: 7 weeks + 3 days, so Monday + 3 = Thursday.', check: computed(after('Monday', 30 - 8 + 30)) },
  35: { key: 'D', confidence: 'high', rule: 'The 7th is Tuesday; the 19th is 12 days later, 1 week + 5 days: Sunday.', check: computed(after(after('Friday', -3), 19 - 7)) },
  36: { key: 'D', confidence: 'high', rule: 'At 5:10, |150 − 55| = 95 degrees.', check: computed(`${angle(5, 10)} degrees`) },
  37: { key: 'C', confidence: 'high', rule: '26 January is 25 days after 1 January: 3 weeks + 4 days, so Sunday + 4 = Thursday.', check: computed(after('Sunday', 26 - 1)) },
  38: { key: 'A', confidence: 'high', rule: '2 March 2003 is 31 days after 30 January: 4 weeks + 3 days, so Thursday + 3 = Sunday.', check: computed(after('Thursday', between([2003, 1, 30], [2003, 3, 2]))) },
  39: { key: 'C', confidence: 'high', rule: 'October has 31 days: 4 weeks + 3, so Sunday + 3 = Wednesday.', check: computed(after('Sunday', 31)) },
  40: { key: 'B', confidence: 'high', rule: 'A century year is a leap year only when it divides by 400: 2800.', check: computed(['2500', '2800', '2600', '2700'].filter((y) => isLeap(+y)).join() || null) },
  41: {
    held: true,
    reason: 'The hands meet at 38 2/11 minutes past 7 (420/11), and no option prints that; the nearest are 38 3/11 and 38 5/11.',
  },
  42: { key: 'C', confidence: 'high', rule: 'At 4:15, |120 − 82.5| = 37.5°.', check: computed(deg(angle(4, 15), '·5')) },
  43: {
    key: 'B',
    confidence: 'medium',
    rule: 'At 7:38, |210 − 209| = 1°.',
    note: 'The minute count sits on the page curl and is read as 38.',
    check: computed(deg(angle(7, 38))),
  },
  44: { key: 'D', confidence: 'high', rule: 'Six hours at 30° an hour: 180°.', check: computed(deg((14 - 8) * 30)) },
  45: { key: 'D', confidence: 'high', rule: 'At 10:25 the hands are |300 − 137.5| = 162.5° apart; the reflex angle is 360 − 162.5 = 197½°.', check: computed(deg(360 - angle(10, 25))) },
  46: { key: 'C', confidence: 'high', rule: 'Noon to 5:10 is 310 minutes, at ½° a minute: 155°.', check: computed(deg((at(17, 10) - at(12)) / 2)) },
  47: { key: 'B', confidence: 'high', rule: 'At 4:20, |120 − 110| = 10°.', check: computed(deg(angle(4, 20))) },
  48: { key: 'C', confidence: 'high', rule: 'At 5:15, |150 − 82.5| = 67½°.', check: computed(deg(angle(5, 15))) },
  49: {
    key: 'C',
    confidence: 'high',
    rule: 'The hands are at right angles twice in every 12/11 hours, so 2 × 22 = 44 times in a day.',
    // The minute hand gains 5.5° a minute; right angles fall at 90°, 270°, 450°, ... of gain: 90 + 180k.
    check: computed(Array.from({ length: 100 }, (_, k) => (90 + 180 * k) / 5.5).filter((m) => m < 24 * 60).length),
  },
  50: { key: 'B', confidence: 'high', rule: 'At 8:30, |240 − 165| = 75°.', check: computed(deg(angle(8, 30))) },
};
