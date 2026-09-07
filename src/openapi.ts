import 'dotenv/config';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './openapi-registry';
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
  info: { title: 'BFF E-learning API', version: '1.0.0' },
});
