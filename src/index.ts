import 'dotenv/config';
import { assertConfigured } from '@mairie360/bffs-lib';
import app from './app';
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
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const port = Number(process.env.PORT || DEFAULT_PORT);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
