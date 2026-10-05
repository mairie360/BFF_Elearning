import 'dotenv/config';
import { assertConfigured } from '@mairie360/bffs-lib';
import app from './app';
import { UPSTREAM_SERVICES } from './clients/upstream';

if (require.main === module) {
  const PORT = process.env.PORT;

  if (!PORT) {
    console.error('Error: PORT environment variable is not set.');
    process.exit(1);
  }

  // No upstream defaults to localhost: a missing or invalid URL is a deployment error, reported at startup.
  try {
    assertConfigured(UPSTREAM_SERVICES);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
