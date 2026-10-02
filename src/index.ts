import app from './app';
import dotenv from 'dotenv';
import { REQUIRED_UPSTREAM_VARIABLES } from './clients/upstream';

dotenv.config();

const PORT = process.env.PORT;

if (!PORT) {
  console.error('Error: PORT environment variable is not set.');
  process.exit(1);
}

// No upstream defaults to localhost: a missing URL is a deployment error, reported at startup.
const missing = REQUIRED_UPSTREAM_VARIABLES.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Error: required environment variables are not set: ${missing.join(', ')}.`);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
