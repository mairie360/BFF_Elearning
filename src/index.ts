import 'dotenv/config';
import { assertConfigured, describeError } from '@mairie360/bffs-lib';
import app from './app';
import { logger } from './logger';
import { UPSTREAM_SERVICES } from './clients/upstream';

/** Documented port of BFF E-learning (`PORT` overrides it). */
const DEFAULT_PORT = 4006;

if (require.main === module) {
  // No upstream defaults to localhost: a missing or invalid URL is a deployment error, reported at startup.
  try {
    assertConfigured(UPSTREAM_SERVICES);
    // The session tokens are verified with it (bffs-lib requireSession): without it every route answers 503.
    if (!process.env.JWT_SECRET?.trim()) throw new Error('Missing configuration: JWT_SECRET');
  } catch (error) {
    logger.error('invalid configuration', { error: describeError(error, { stack: false }) });
    process.exit(1);
  }

  const port = Number(process.env.PORT || DEFAULT_PORT);
  app.listen(port, () => {
    logger.info('server listening', { port });
  });
}
