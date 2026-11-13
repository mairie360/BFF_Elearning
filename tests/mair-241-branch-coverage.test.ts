import { buildCatalogResponse, courseProgress, toChapter, toCourse } from '../src/routes/Elearning/elearning_helpers';

const chapterOf = (id: number, completed: boolean, description?: string) => ({
  module: { id, name: `Chapitre ${id}`, completed, ...(description === undefined ? {} : { description }) },
  files: [],
}) as never;

// MAIR-241: the fallbacks of the course helpers (no chapter, status derived from the progress, optional fields,
// catalog filters) that the journeys never reach, so the 80 % branch threshold holds on its own.
describe('MAIR-241 branch coverage of the e-learning helpers', () => {
  test('a course without chapter has no progress and is not started', () => {
    const course = toCourse({ id: 1, name: 'Sécurité' }, []);

    expect(courseProgress([])).toMatchObject({ progress: 0, completed: false, totalChapters: 0 });
    expect(course).toMatchObject({ statusValue: 'not-started', description: '', chapters: 0 });
  });

  test.each([
    ['in-progress', [chapterOf(1, true), chapterOf(2, false)]],
    ['completed', [chapterOf(1, true), chapterOf(2, true)]],
    ['not-started', [chapterOf(1, false)]],
  ])('derives the %s status from the progress when upstream gives none', (status, chapters) => {
    expect(toCourse({ id: 1, name: 'Sécurité', description: 'Les bases' }, chapters).statusValue).toBe(status);
  });

  test('a non-string upstream status is ignored and the progress decides', () => {
    expect(toCourse({ id: 1, name: 'Sécurité', status: 42 }, [chapterOf(1, true)]).statusValue).toBe('completed');
  });

  test('a chapter carries its description only when upstream has one', () => {
    expect(toChapter(chapterOf(1, false, 'Intro'))).toMatchObject({ description: 'Intro' });
    expect(toChapter(chapterOf(2, false))).not.toHaveProperty('description');
  });

  test('the catalog filters on search, category and status and ignores the "all" filters', () => {
    const user = { id: 'user-1', name: 'Agent' } as never;
    const courses = [
      { id: '1', title: 'Sécurité', description: 'Les bases', category: 'it', statusValue: 'completed' },
      { id: '2', title: 'Accueil', description: '', category: 'rh', statusValue: 'not-started' },
    ] as never;

    const ids = (query: object) => buildCatalogResponse(query as never, user, courses).catalog.courses.map((course: { id: string }) => course.id);

    expect(ids({ category: 'all', status: 'all' })).toEqual(['1', '2']);
    expect(ids({ search: 'securite' })).toEqual(['1']);
    expect(ids({ category: 'rh' })).toEqual(['2']);
    expect(ids({ status: 'completed' })).toEqual(['1']);
    expect(ids({ search: 'accueil', category: 'it' })).toEqual([]);
  });
});
