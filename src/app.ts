import { openApiDocument as swaggerSpec } from './openapi';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import checkApisRouter from './routes/check_apis';
import catalogRouter from './routes/Elearning/catalog';
import profileRouter from './routes/Elearning/profile';
import contentCompleteRouter from './routes/Elearning/content_complete';
import ratingRouter from './routes/Elearning/rating';
import startRouter from './routes/Elearning/start';
import adminCoursesRouter from './routes/Elearning/admin_courses';

dotenv.config();

const app = express();
// En-têtes de sécurité (CSP, X-Content-Type-Options, Permissions-Policy, CORP…) et
// suppression de X-Powered-By. upgrade-insecure-requests est retiré car le BFF est
// servi en HTTP derrière le reverse proxy.
app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } } }));
app.use(express.json());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get(['/openapi.json', '/swagger.json'], (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/health', healthRouter);
app.use('/check_apis', checkApisRouter);
app.use('/elearning/catalog', catalogRouter);
app.use('/elearning/profile', profileRouter);
app.use('/elearning/courses', contentCompleteRouter);
app.use('/elearning/courses', ratingRouter);
app.use('/elearning/courses', startRouter);
app.use('/elearning/admin/courses', adminCoursesRouter);

// Route inconnue : 404 JSON (le fallback Express répond en text/html).
app.use((_req: Request, res: Response) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' } }));
// Erreurs non gérées (ex. JSON malformé -> 400 via body-parser) : JSON, sans détail interne.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const raw = (err as { status?: unknown; statusCode?: unknown }) ?? {};
  const status = typeof raw.status === 'number' ? raw.status : typeof raw.statusCode === 'number' ? raw.statusCode : 500;
  if (status >= 500) console.error('[BFF] Unexpected error', err);
  res.status(status).json({
    error: status >= 500
      ? { code: 'INTERNAL_ERROR', message: 'Erreur interne du service.' }
      : { code: 'BAD_REQUEST', message: 'Requête invalide.' },
  });
});
export default app;
