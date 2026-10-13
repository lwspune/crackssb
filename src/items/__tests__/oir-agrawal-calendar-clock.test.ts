import source from '../../../content/oir/agrawal-examcart/ch14-calendar-clock.source.json' with { type: 'json' };
import { AGRAWAL_CH14_CALENDAR_CLOCK as KEY } from '../oir/agrawal-ch14-calendar-clock.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 14 (Calender [sic] and Clock), pages 53-54:
 * weekdays from dates and offsets, clock-hand angles, fast clocks and dials
 * turned to face a compass point. Real dates are read from the calendar
 * itself; every other key is arithmetic. The chapter prints no direction.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch14',
  reasoningType: 'calendar_clock',
  count: 50,
  held: [14, 23, 41],
  reasoned: [],
});
