import request from 'supertest';
import app from '../src/app';

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
      role: 'admin',
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
      ]),
    );
  });
});
