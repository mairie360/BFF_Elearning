import 'dotenv/config';
import {
  apiOnlyHeaders, errorHandler, noStore, notFoundHandler, parseTrustProxy, requestLogger, requireSession, securityHeaders,
} from '@mairie360/bffs-lib';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';
import { logger } from './logger';
import healthRouter from './routes/health';
import checkApisRouter from './routes/check_apis';
import catalogRouter from './routes/Elearning/catalog';
import profileRouter from './routes/Elearning/profile';
import contentCompleteRouter from './routes/Elearning/content_complete';
import ratingRouter from './routes/Elearning/rating';
import startRouter from './routes/Elearning/start';
import adminCoursesRouter from './routes/Elearning/admin_courses';
import adminStatsRouter from './routes/Elearning/admin_stats';
import adminLearnersRouter from './routes/Elearning/admin_learners';
import adminAgentsRouter from './routes/Elearning/admin_agents';
import certificateRouter from './routes/Elearning/certificate';
import certificatesRouter from './routes/Elearning/certificates';
import contentFileRouter from './routes/Elearning/content_file';
import trainingTimeRouter from './routes/Elearning/training_time';

export const app = express();
// Client IP (req.ip) as seen behind the ingress: unset or `false` trusts no proxy.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
// First: every request gets an id and one JSON log line when it ends (method, route, status, duration; MAIR-531).
app.use(requestLogger({ logger }));
// Security headers shared by every BFF on every response, then the stricter API-only headers everywhere but
// /docs; both run before body parsing so that they also cover body-parse error responses.
app.use(securityHeaders);
app.use(apiOnlyHeaders());
app.use(express.json());

// Interactive documentation, and the JSON spec: /openapi.json is the target of the ZAP scan
// (docker-compose-security.yml), /swagger.json is read by the CI composite action.
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get(['/openapi.json', '/swagger.json'], (_req, res) => res.json(openApiDocument));

app.use('/health', healthRouter);
app.use('/check_apis', checkApisRouter);

// Session-bound routes: never cached (`Cache-Control: no-store`) and refused with a 401 before any upstream
// call unless the request carries an `Authorization: Bearer <token>` verified with Core's public key JWT_PUBLIC_KEY
// (EdDSA, expiry; bffs-lib requireSession, MAIR-474, MAIR-680). Cookies and other headers are ignored.
const session = [noStore, requireSession];
app.use('/elearning/catalog', session, catalogRouter);
app.use('/elearning/profile', session, profileRouter);
app.use('/elearning/courses', session, contentCompleteRouter, ratingRouter, startRouter, certificateRouter, contentFileRouter);
app.use('/elearning/training-time', session, trainingTimeRouter);
app.use('/elearning/certificates', session, certificatesRouter);
app.use('/elearning/admin/courses', session, adminCoursesRouter, adminLearnersRouter);
app.use('/elearning/admin/agents', session, adminAgentsRouter);
app.use('/elearning/admin/stats', session, adminStatsRouter);

// Unknown routes and every error end in the shared envelope `{ error: { code, message, details } }`: the
// status of the error is kept (400 for an unparsable body, 401, 403, 404, 409, 502, 503...) and anything
// unexpected becomes a 500 without leaking its message (it is only logged).
app.use(notFoundHandler);
app.use(errorHandler({ logger }));

export default app;
