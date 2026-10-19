import { spawnSync } from 'node:child_process';
import path from 'node:path';

// The entry point is run as a real process: it must refuse to start when an upstream URL is missing, and importing it
// (as the tests do with the app) must not listen nor check the configuration.

const root = path.join(__dirname, '..');
const tsx = path.join(root, 'node_modules', '.bin', 'tsx');

function start(env: Record<string, string>) {
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !/^(CORE_API|ELEARNING_API)_(URL|PORT)$/.test(name) && name !== 'PORT'),
  );
  return spawnSync(tsx, ['src/index.ts'], {
    cwd: root,
    // `.env` is never read here: the test controls the whole configuration.
    env: { ...base, DOTENV_CONFIG_PATH: path.join(root, 'tests', 'no-such.env'), ...env },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

/** The JSON line `src/index.ts` writes on stdout before exiting (MAIR-531: logs go through the lib logger). */
function startupError(stdout: string) {
  return stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((line) => line.level === 'ERROR');
}

describe('startup', () => {
  test('refuses to start and names every missing upstream URL', () => {
    const result = start({ PORT: '0', CORE_API_PORT: '3000' });

    expect(result.status).toBe(1);
    expect(startupError(result.stdout)).toEqual(expect.objectContaining({
      target: 'bff-elearning', message: 'invalid configuration', error: expect.stringContaining('Missing or invalid upstream configuration: CORE_API_URL, ELEARNING_API_URL'),
    }));
  });

  test('refuses to start without JWT_SECRET, which verifies the session tokens', () => {
    const result = start({
      PORT: '0', JWT_SECRET: '', CORE_API_URL: 'core-api', ELEARNING_API_URL: 'elearning-api',
    });

    expect(result.status).toBe(1);
    expect(startupError(result.stdout)).toEqual(expect.objectContaining({
      target: 'bff-elearning', message: 'invalid configuration', error: expect.stringContaining('Missing configuration: JWT_SECRET'),
    }));
  });

  test('importing the entry point neither listens nor checks the configuration', async () => {
    const saved = process.env.ELEARNING_API_URL;
    delete process.env.ELEARNING_API_URL;
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');

    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
    if (saved !== undefined) process.env.ELEARNING_API_URL = saved;
  });
});
