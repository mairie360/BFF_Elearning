import request from 'supertest';
import app from '../src/app';
import { getAuthenticatedUser } from '../src/routes/Elearning/auth';

jest.mock('../src/routes/Elearning/auth', () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({
    id: 'user-123',
    name: 'Admin Systeme',
    initials: 'AS',
    email: 'admin@mairie360.fr',
    role: 'Admin',
    isAdmin: true,
  }),
}));

const authenticatedUserMock = jest.mocked(getAuthenticatedUser);

describe('E-learning BFF routes', () => {
  it('returns the catalog payload expected by the frontend', async () => {
    const res = await request(app).get('/elearning/catalog?status=in-progress');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: 'user-123',
      isAdmin: true,
    });
    expect(res.body.catalog).toMatchObject({
      title: 'Centre de Formation',
      emptyLabel: 'Aucune formation ne correspond a votre recherche.',
      adminStats: {
        totalCourses: 3,
        totalLearners: 425,
        mandatoryCourses: 2,
        totalContents: 23,
        averageRating: 4.8,
        completionRate: 50,
      },
    });
    expect(res.body.catalog.courses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'accueil-agents',
          statusValue: 'in-progress',
        }),
      ]),
    );
  });

  it('updates only editable profile fields', async () => {
    const res = await request(app)
      .patch('/elearning/profile')
      .send({
        email: 'agent@mairie360.fr',
        city: 'Saint-Paul',
        role: 'user',
        isAdmin: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'agent@mairie360.fr',
      city: 'Saint-Paul',
      role: 'Admin',
      isAdmin: true,
    });
  });

  it('completes content and returns updated progress details', async () => {
    const res = await request(app)
      .post('/elearning/courses/rgpd-collectivites/contents/rgpd-1-video/complete')
      .send({
        chapterId: 'rgpd-1',
        completed: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.content).toMatchObject({
      id: 'rgpd-1-video',
      completed: true,
    });
    expect(res.body.progress).toBeGreaterThan(0);
  });

  it('keeps course progression isolated between authenticated users', async () => {
    authenticatedUserMock
      .mockResolvedValueOnce({
        id: 'isolated-user-a',
        name: 'Agent A',
        initials: 'AA',
        role: 'User',
        isAdmin: false,
      })
      .mockResolvedValueOnce({
        id: 'isolated-user-b',
        name: 'Agent B',
        initials: 'AB',
        role: 'User',
        isAdmin: false,
      });

    const completionResponse = await request(app)
      .post('/elearning/courses/rgpd-collectivites/contents/rgpd-1-video/complete')
      .send({ chapterId: 'rgpd-1', completed: true });
    const secondUserCatalog = await request(app).get('/elearning/catalog');
    const secondUserCourse = secondUserCatalog.body.catalog.courses.find(
      (course: { id: string }) => course.id === 'rgpd-collectivites',
    );
    const secondUserContent = secondUserCourse.details.chapters[0].contents.find(
      (content: { id: string }) => content.id === 'rgpd-1-video',
    );

    expect(completionResponse.status).toBe(200);
    expect(secondUserCatalog.status).toBe(200);
    expect(secondUserContent.completed).not.toBe(true);
  });

  it('lets an administrator create, update and delete a complete formation', async () => {
    const course = {
      id: 'prevention-incendie-test',
      title: 'Prévention incendie',
      description: 'Identifier les risques et appliquer les consignes d’évacuation.',
      instructor: 'Anne Leroy',
      duration: '1 h 15',
      category: 'Sécurité',
      deadline: '30 juin 2026',
      statusValue: 'not-started',
      progress: 0,
      titleBadge: { label: 'Obligatoire', variant: 'mandatory' },
      levelBadge: { label: 'Débutant', variant: 'beginner' },
      details: {
        title: 'Prévention incendie',
        subtitle: 'Les bons réflexes en mairie',
        description: 'Identifier les risques et appliquer les consignes d’évacuation.',
        instructor: 'Anne Leroy',
        duration: '1 h 15',
        progress: 0,
        chapters: [
          {
            id: 'incendie-alert',
            title: 'Prévenir et donner l’alerte',
            description: 'Reconnaître les risques et connaître la procédure.',
            duration: '35 min',
            contents: [
              {
                id: 'incendie-alert-video',
                title: 'Vidéo : déclencher l’alarme',
                type: 'video',
                duration: '12 min',
                fileName: 'alarme-incendie.mp4',
                required: true,
              },
            ],
          },
        ],
      },
    };

    const createResponse = await request(app).post('/elearning/admin/courses').send(course);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.course).toMatchObject({
      id: course.id,
      chapters: 1,
      deadline: '30 juin 2026',
      details: {
        subtitle: 'Les bons réflexes en mairie',
        chapters: [
          expect.objectContaining({
            description: 'Reconnaître les risques et connaître la procédure.',
            contents: [expect.objectContaining({ fileName: 'alarme-incendie.mp4' })],
          }),
        ],
      },
    });

    const updateResponse = await request(app)
      .patch(`/elearning/admin/courses/${course.id}`)
      .send({
        ...course,
        title: 'Prévention incendie actualisée',
        deadline: '15 juillet 2026',
        levelBadge: { label: 'Intermédiaire', variant: 'intermediate' },
        details: {
          ...course.details,
          title: 'Prévention incendie actualisée',
        },
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.course).toMatchObject({
      id: course.id,
      title: 'Prévention incendie actualisée',
      deadline: '15 juillet 2026',
      levelBadge: { label: 'Intermédiaire', variant: 'intermediate' },
    });

    const catalogResponse = await request(app).get('/elearning/catalog');
    expect(catalogResponse.body.catalog.adminStats.totalCourses).toBe(4);
    expect(catalogResponse.body.catalog.courses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: course.id,
          title: 'Prévention incendie actualisée',
        }),
      ]),
    );

    const deleteResponse = await request(app).delete(`/elearning/admin/courses/${course.id}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ deleted: true, courseId: course.id });

    const catalogAfterDelete = await request(app).get('/elearning/catalog');
    expect(catalogAfterDelete.body.catalog.adminStats.totalCourses).toBe(3);
    expect(catalogAfterDelete.body.catalog.courses).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: course.id })]),
    );
  });

  it('rejects formation management for non-administrators', async () => {
    authenticatedUserMock.mockResolvedValueOnce({
      id: 'standard-user',
      name: 'Agent Standard',
      initials: 'AS',
      role: 'User',
      isAdmin: false,
    });

    const res = await request(app).post('/elearning/admin/courses').send({
      id: 'forbidden-course',
      title: 'Formation interdite',
      description: 'Cette requête doit être refusée.',
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('exposes the E-learning routes in swagger.json', async () => {
    const res = await request(app).get('/swagger.json');

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/elearning/catalog',
        '/elearning/profile',
        '/elearning/courses/{courseId}/contents/{contentId}/complete',
        '/elearning/courses/{courseId}/rating',
        '/elearning/courses/{courseId}/start',
        '/elearning/admin/courses',
        '/elearning/admin/courses/{courseId}',
      ]),
    );
  });
});
