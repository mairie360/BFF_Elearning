import 'dotenv/config';
// Before the app: OpenTelemetry must hook Express before it is loaded (MAIR-504).
import './telemetry';
import { assertConfigured, describeError, sessionKeysFromEnv } from '@mairie360/bffs-lib';
import app from './app';
import { logger } from './logger';
import { UPSTREAM_SERVICES } from './clients/upstream';

/** Documented port of BFF E-learning (`PORT` overrides it). */
const DEFAULT_PORT = 4006;

/**
 * Startup check: no upstream defaults to localhost, so a missing or invalid URL is a deployment error, and so is a
 * missing or malformed session key. The session tokens are verified with Core's public key `JWT_PUBLIC_KEY`
 * (MAIR-680, bffs-lib requireSession); `JWT_SECRET` alone is still accepted during the transition (HS256 tokens).
 */
export function assertStartupConfiguration(): void {
  assertConfigured(UPSTREAM_SERVICES);
  let keys: ReturnType<typeof sessionKeysFromEnv>;
  try {
    keys = sessionKeysFromEnv();
  } catch {
    // The parsing detail is not needed to fix it, and the key is not logged.
    throw new Error('Invalid configuration: JWT_PUBLIC_KEY must hold Ed25519 PUBLIC KEY PEM blocks');
  }
  if (keys === undefined) {
    throw new Error('Missing configuration: JWT_PUBLIC_KEY (or JWT_SECRET during the HS256 transition)');
  }
}

if (require.main === module) {
  try {
    assertStartupConfiguration();
  } catch (error) {
    logger.error('invalid configuration', { error: describeError(error, { stack: false }) });
    process.exit(1);
  }

  const port = Number(process.env.PORT || DEFAULT_PORT);
  app.listen(port, () => {
    logger.info('server listening', { port });
  });
}
