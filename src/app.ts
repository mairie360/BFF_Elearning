import express from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './openapi-registry';
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
app.use(express.json());

const openApiGenerator = new OpenApiGeneratorV3(registry.definitions);

const swaggerSpec = openApiGenerator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'BFF E-learning API',
    version: '1.0.0',
    description: 'Contrat du BFF E-learning généré via Zod et OpenAPI.',
  },
  servers: [
    {
      url: `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? 4006}`,
      description: 'Serveur local',
    },
  ],
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/swagger.json', (_req, res) => {
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

export default app;
