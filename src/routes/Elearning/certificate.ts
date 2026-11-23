import { parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import { CourseIdParams, ErrorResponse, PdfDocument, registry, sessionErrorResponses } from '../../openapi-registry';
import { loadCertificate, type PdfFile } from './elearning_upstream';

const router = Router();

/** Sends a PDF of the E-learning API as it is, with its file name (or `fallbackName`). */
export function sendPdf(res: Response, file: PdfFile, fallbackName: string): void {
  res
    .status(200)
    .type('application/pdf')
    .setHeader('Content-Disposition', file.disposition ?? `attachment; filename="${fallbackName}"`)
    .send(file.content);
}

registry.registerPath({
  method: 'get',
  path: '/elearning/courses/{courseId}/certificate',
  tags: ['E-learning'],
  summary: 'Attestation of a course the caller completed (PDF)',
  description: 'The PDF attestation written by the E-learning API, with its `Content-Disposition` file name.',
  request: { params: CourseIdParams },
  responses: {
    200: {
      description: 'PDF attestation',
      headers: { 'Content-Disposition': { description: 'File name of the attestation', schema: { type: 'string' } } },
      content: { 'application/pdf': { schema: PdfDocument } },
    },
    400: { description: 'Invalid course identifier', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'Unknown course, or the caller is not enrolled in it', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'The caller has not completed the course yet', content: { 'application/json': { schema: ErrorResponse } } },
    ...sessionErrorResponses,
    500: { description: 'Unexpected server error', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

router.get('/:courseId/certificate', async (req: Request, res: Response) => {
  const { courseId } = parseRequest(CourseIdParams, req.params, 'params');
  sendPdf(res, await loadCertificate(req, courseId), `attestation-${courseId}.pdf`);
});

export default router;
