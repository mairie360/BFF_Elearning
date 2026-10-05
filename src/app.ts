import { openApiDocument as swaggerSpec } from './openapi';
import { errorHandler, noStore, notFoundHandler, parseTrustProxy, requireBearer } from '@mairie360/bffs-lib';
import express from 'express';
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
// Client IP (req.ip) as seen behind the ingress: unset or `false` trusts no proxy.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
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
// Session-bound routes: never cached (`Cache-Control: no-store`) and refused with a 401 before any upstream
// call when the request carries no `Authorization: Bearer <token>` (cookies and other headers are ignored).
const session = [noStore, requireBearer];
app.use('/elearning/catalog', session, catalogRouter);
app.use('/elearning/profile', session, profileRouter);
app.use('/elearning/courses', session, contentCompleteRouter, ratingRouter, startRouter);
app.use('/elearning/admin/courses', session, adminCoursesRouter);

// Unknown routes and every error end in the shared envelope `{ error: { code, message, details } }`: the
// status of the error is kept (400 for an unparsable body, 401, 403, 404, 409, 502...) and anything
// unexpected becomes a 500 without leaking its message (it is only logged).
app.use(notFoundHandler);
app.use(errorHandler({ onError: (error) => console.error('[BFF] Unexpected error', error) }));
export default app;
