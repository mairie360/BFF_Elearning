import 'dotenv/config';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { bearerAuth, registry } from './openapi-registry';
import './routes/health';
import './routes/check_apis';
import './routes/Elearning/admin_courses';
import './routes/Elearning/catalog';
import './routes/Elearning/content_complete';
import './routes/Elearning/profile';
import './routes/Elearning/rating';
import './routes/Elearning/start';

// Runtime documentation and exported clients use the same mounted routes.
export const openApiDocument = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  // Snake_case like the Rust APIs: orval derives endpoints/bffElearning.ts + getBffElearning() from it.
  info: { title: 'bff_elearning', version: '1.0.0' },
  // Session JWT in the Authorization header, unless the operation declares `security: []`.
  security: [{ [bearerAuth.name]: [] }],
});
