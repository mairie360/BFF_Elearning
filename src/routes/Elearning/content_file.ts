import { parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import { ChapterContentParams, ContentFileResponse, ErrorResponse, registry, sessionErrorResponses } from '../../openapi-registry';
import { loadContentFile } from './elearning_upstream';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/courses/{courseId}/chapters/{chapterId}/contents/{contentId}/file',
  tags: ['E-learning'],
  summary: 'Signed URL of a stored file of a course',
  description:
    'Where to open a stored file (video, PDF, document, audio) of a course the caller is enrolled in: a URL valid a few minutes, to ask for again on every opening. A link carries its own `href` in the catalogue; a link, a quiz or `other` has no file (404).',
  request: { params: ChapterContentParams },
  responses: {
    200: { description: 'Signed URL of the file', content: { 'application/json': { schema: ContentFileResponse } } },
    400: { description: 'Invalid identifiers', content: { 'application/json': { schema: ErrorResponse } } },
    404: {
      description: 'Unknown course or course the caller is not enrolled in, or no stored file under this chapter and id',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    ...sessionErrorResponses,
    500: { description: 'Unexpected server error', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

router.get('/:courseId/chapters/:chapterId/contents/:contentId/file', async (req: Request, res: Response) => {
  const { courseId, chapterId, contentId } = parseRequest(ChapterContentParams, req.params, 'params');
  return res.status(200).json(await loadContentFile(req, courseId, chapterId, contentId));
});

export default router;
