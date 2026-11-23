import { HttpError } from '@mairie360/bffs-lib';
import {
  fieldOfUpstreamError, formatDuration, parseDeadline, parseDuration, toChapter, toCourse, toCourseBody,
} from '../src/routes/Elearning/elearning_helpers';

// MAIR-1150: the pure conversions of the E-learning V2 routes (durations, dates, admin body), whose edge cases the
// journeys of the upstream-mock suite do not all reach.
describe('MAIR-1150 E-learning V2 helpers', () => {
  test.each([
    [0, undefined], [null, undefined], [45, '45 s'], [60, '1 min'], [720, '12 min'], [3600, '1 h'], [8100, '2 h 15'], [3900, '1 h 05'],
  ])('formatDuration(%p) is %p', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });

  test.each([
    ['12 min', 720], ['1 h 30', 5400], ['1h30', 5400], ['2 h 15 min', 8100], ['90 s', 90], ['2 min 10', 130], ['12:30', 750],
    ['1:02:00', 3720], ['45', 2700], ['1,5 h', 5400], ['  ', null], ['', null],
  ])('parseDuration(%p) is %p seconds', (text, seconds) => {
    expect(parseDuration(text)).toBe(seconds);
  });

  test.each(['deux heures', '10 jours', '1 h 30 15 20', '12:75', 'min', '30 s 10'])('parseDuration(%p) cannot be read', (text) => {
    expect(parseDuration(text)).toBeUndefined();
  });

  test.each([
    ['2026-06-30', '2026-06-30'], ['2026-06-30T23:00:00Z', '2026-06-30'], ['30 juin 2026', '2026-06-30'], ['1er mars 2027', '2027-03-01'],
    ['15 Août 2026', '2026-08-15'], ['', null],
  ])('parseDeadline(%p) is %p', (text, date) => {
    expect(parseDeadline(text)).toBe(date);
  });

  test.each(['2026-02-30', '30 brumaire 2026', 'demain'])('parseDeadline(%p) cannot be read', (text) => {
    expect(parseDeadline(text)).toBeUndefined();
  });

  test.each([
    ['url: not https', 'href'], ['modules[2].files[0].file_type', 'type'], ['is_mandatory', 'mandatory'], ['nothing known', undefined],
  ])('fieldOfUpstreamError(%p) is %p', (text, field) => {
    expect(fieldOfUpstreamError(text)).toBe(field);
  });

  test('fieldOfUpstreamError ignores a body that is not text', () => {
    expect(fieldOfUpstreamError({ url: 'x' })).toBeUndefined();
  });

  test('a legacy file without kind keeps its type from file_type, and a module without duration sums its contents', () => {
    const chapter = toChapter({
      module: { id: 1, name: 'Intro', completed: false },
      files: [
        { id: 2, file_name: 'a.mp4', file_type: 'Video', duration_seconds: 120 },
        { id: 3, file_name: 'b', file_type: 'Error' },
      ],
    });
    expect(chapter).toMatchObject({ duration: '2 min', durationSeconds: 120 });
    expect(chapter.contents?.map((content) => content.type)).toEqual(['video', 'other']);
    expect(chapter.contents?.[1]).not.toHaveProperty('fileName');
  });

  test('a formation without rating count shows its average without label, and a level without badge text keeps none', () => {
    const course = toCourse({ id: 1, name: 'Sécurité', rating_average: 3, level: null, is_mandatory: false }, []);
    expect(course).toMatchObject({ rating: 3, mandatory: false });
    expect(course).not.toHaveProperty('titleBadge');
    expect(course).not.toHaveProperty('levelBadge');
    expect(course.details).not.toHaveProperty('ratingLabel');
    expect(course.details).not.toHaveProperty('completionRating');
  });

  const base = { id: '7', title: 'Cours', description: '' };

  test('an admin body without anything optional sends the defaults', () => {
    expect(toCourseBody(base, { keepIds: true })).toEqual({
      name: 'Cours', description: null, category: null, level: null, is_mandatory: false, deadline: null, source: 'internal',
      instructor: null, modules: [],
    });
  });

  test('the level is read from the badge variant, else its label, and durationSeconds wins over duration', () => {
    const body = toCourseBody({
      ...base,
      levelBadge: { label: 'x', variant: 'intermediate' },
      details: { title: 'Cours', description: '', chapters: [{ id: '3', title: 'C', contents: [{ id: '4', title: 'Q', type: 'quiz', duration: '???', durationSeconds: 60 }] }] },
    }, { keepIds: true });
    expect(body).toMatchObject({ level: 'intermediate', modules: [{ id: 3, files: [{ id: 4, duration_seconds: 60 }] }] });
    expect(toCourseBody({ ...base, levelBadge: { label: 'Debutant' } }, { keepIds: false }).level).toBe('beginner');
    expect(toCourseBody({ ...base, levelBadge: { label: 'Expert' } }, { keepIds: false }).level).toBeNull();
  });

  test('every bound of the E-learning API is a 400 naming the field', () => {
    const contents = Array.from({ length: 101 }, (_, i) => ({ id: `n${i}`, title: 'Q', type: 'quiz' as const }));
    let error: unknown;
    try {
      toCourseBody({
        ...base,
        title: 'x'.repeat(256),
        category: 'c'.repeat(129),
        details: {
          title: 'Cours', description: '', instructor: 'i'.repeat(256),
          chapters: [{ id: '1', title: '', description: 'd'.repeat(10_001), contents: [...contents.slice(0, 1).map((c) => ({ ...c, description: 'd'.repeat(10_001), durationSeconds: 3_000_000_000 })), ...contents.slice(1)] }],
        },
      }, { keepIds: true });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).details.map((detail) => detail.path)).toEqual([
      'body.title',
      'body.category',
      'body.details.instructor',
      'body.details.chapters.0.title',
      'body.details.chapters.0.description',
      'body.details.chapters.0.contents',
      'body.details.chapters.0.contents.0.description',
      'body.details.chapters.0.contents.0.duration',
    ]);
  });

  test('a link URL must be an absolute https URL', () => {
    const withHref = (href?: string) => () => toCourseBody({
      ...base, details: { title: 'Cours', description: '', chapters: [{ id: '1', title: 'C', contents: [{ id: 'l', title: 'L', type: 'link', href }] }] },
    }, { keepIds: false });
    expect(withHref('https://example.org/a')().modules?.[0].files?.[0]).toMatchObject({ url: 'https://example.org/a' });
    for (const href of [undefined, 'not a url', 'ftp://example.org', 'https://exa mple.org']) expect(withHref(href)).toThrow(HttpError);
  });
});
