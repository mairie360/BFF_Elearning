import { assertConfigured, HttpError } from '@mairie360/bffs-lib';
import coreClient from '../src/clients/coreClient';
import elearningClient from '../src/clients/elearningClient';
import { asCaller, UPSTREAM_SERVICES } from '../src/clients/upstream';
import { userBffOptions } from '../src/clients/userBffClient';

describe('upstream configuration', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.restoreAllMocks(); });

  test.each([
    ['a bare host and a port variable', 'elearning-api', '3006', 'http://elearning-api:3006'],
    ['a URL with scheme and port (the port variable is ignored)', 'http://elearning-api:3006/', '9999', 'http://elearning-api:3006'],
    ['an https URL without port', 'https://elearning.example.org', undefined, 'https://elearning.example.org'],
    ['a URL with a path prefix', 'http://gateway:8080/elearning/', undefined, 'http://gateway:8080/elearning'],
  ])('builds the base URL from %s', (_label, url, port, expected) => {
    process.env.ELEARNING_API_URL = url;
    if (port === undefined) delete process.env.ELEARNING_API_PORT;
    else process.env.ELEARNING_API_PORT = port;

    expect(asCaller('ELEARNING_API', 'Bearer abc').baseURL).toBe(expected);
  });

  test.each([undefined, '', '   '])('has no localhost fallback for %p: 503 not configured', (url) => {
    if (url === undefined) delete process.env.CORE_API_URL;
    else process.env.CORE_API_URL = url;

    expect(() => asCaller('CORE_API', 'Bearer abc')).toThrow(new HttpError(503, 'The CORE_API service is not configured.'));
  });

  test('answers 503 for a URL that cannot be parsed', () => {
    process.env.CORE_API_URL = 'http://';

    expect(() => asCaller('CORE_API', 'Bearer abc')).toThrow(new HttpError(503, 'The CORE_API service is misconfigured.'));
  });

  test('reads the URL on every call, never at import time', () => {
    process.env.USER_BFF_URL = 'http://bff-user:4000';
    expect(userBffOptions('Bearer abc').baseURL).toBe('http://bff-user:4000');

    process.env.USER_BFF_URL = 'http://bff-user-2:4000';
    expect(userBffOptions('Bearer abc').baseURL).toBe('http://bff-user-2:4000');
  });

  test('forwards the caller session to the configured service', () => {
    process.env.USER_BFF_URL = 'http://bff-user:4000';

    expect(userBffOptions('Bearer abc')).toEqual({ baseURL: 'http://bff-user:4000', headers: { Authorization: 'Bearer abc' } });
    expect(asCaller('USER_BFF', 'Bearer abc')).toEqual(userBffOptions('Bearer abc'));
  });

  test('the startup check covers every upstream the BFF calls', () => {
    for (const service of UPSTREAM_SERVICES) delete process.env[`${service}_URL`];

    expect(UPSTREAM_SERVICES).toEqual(['USER_BFF', 'CORE_API', 'ELEARNING_API']);
    expect(() => assertConfigured(UPSTREAM_SERVICES)).toThrow(
      'Missing or invalid upstream configuration: USER_BFF_URL, CORE_API_URL, ELEARNING_API_URL',
    );
  });

  test('generated clients carry no base URL frozen at import time', () => {
    expect(elearningClient.getGetMyFormationsUrl()).not.toMatch(/localhost|^http/);
    expect(coreClient.getPatchMeUrl()).not.toMatch(/localhost|^http/);
  });
});

describe('generated API clients', () => {
  test('call E-learning API through the operations of its published contract', () => {
    expect(elearningClient.getGetMyFormationsUrl()).toBe('/api/v1/formations/');
    expect(elearningClient.getCompleteModuleUrl(4, 11)).toBe('/api/v1/formations/4/11/');
  });

  test('call Core API through the operations of its published contract', () => {
    expect(coreClient.getPatchMeUrl()).toBe('/api/v1/user/me/');
  });
});
