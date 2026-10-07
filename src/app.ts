import 'dotenv/config';
import {
  apiOnlyHeaders, errorHandler, noStore, notFoundHandler, parseTrustProxy, requireBearer, securityHeaders,
} from '@mairie360/bffs-lib';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';
import healthRouter from './routes/health';
import checkApisRouter from './routes/check_apis';
import catalogRouter from './routes/Elearning/catalog';
import profileRouter from './routes/Elearning/profile';
import contentCompleteRouter from './routes/Elearning/content_complete';
import ratingRouter from './routes/Elearning/rating';
import startRouter from './routes/Elearning/start';
import adminCoursesRouter from './routes/Elearning/admin_courses';

export const app = express();
// Client IP (req.ip) as seen behind the ingress: unset or `false` trusts no proxy.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
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
// call when the request carries no `Authorization: Bearer <token>` (cookies and other headers are ignored).
const session = [noStore, requireBearer];
app.use('/elearning/catalog', session, catalogRouter);
app.use('/elearning/profile', session, profileRouter);
app.use('/elearning/courses', session, contentCompleteRouter, ratingRouter, startRouter);
app.use('/elearning/admin/courses', session, adminCoursesRouter);

// Unknown routes and every error end in the shared envelope `{ error: { code, message, details } }`: the
// status of the error is kept (400 for an unparsable body, 401, 403, 404, 409, 502, 503...) and anything
// unexpected becomes a 500 without leaking its message (it is only logged).
app.use(notFoundHandler);
// The 5xx are logged by the handler's default report: never pass it a report that logs the error as is,
// whose upstream `cause` holds the caller's Bearer token and the request and response bodies (MAIR-290).
app.use(errorHandler());

export default app;
