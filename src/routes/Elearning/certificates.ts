import { parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import { ErrorResponse, PdfDocument, registry, sessionErrorResponses, YearQuery } from '../../openapi-registry';
import { sendPdf } from './certificate';
import { loadCertificates } from './elearning_upstream';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/certificates',
  tags: ['E-learning'],
  summary: 'Attestations of the courses the caller completed during a year (PDF)',
  description: 'One PDF written by the E-learning API, with its `Content-Disposition` file name.',
  request: { query: YearQuery },
  responses: {
    200: {
      description: 'PDF attestations of the year',
      headers: { 'Content-Disposition': { description: 'File name of the attestations', schema: { type: 'string' } } },
      content: { 'application/pdf': { schema: PdfDocument } },
    },
    400: { description: 'Invalid year', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'The caller completed no course during this year', content: { 'application/json': { schema: ErrorResponse } } },
    ...sessionErrorResponses,
    500: { description: 'Unexpected server error', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

router.get('/', async (req: Request, res: Response) => {
  const { year } = parseRequest(YearQuery, req.query, 'query');
  sendPdf(res, await loadCertificates(req, year), `attestations-${year ?? new Date().getUTCFullYear()}.pdf`);
});

export default router;
