import { HttpError } from '@mairie360/bffs-lib';
import coreClient from '../src/clients/coreClient';
import elearningClient from '../src/clients/elearningClient';
import { asCaller, baseUrl, configuredBaseUrl } from '../src/clients/upstream';
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

    expect(configuredBaseUrl('ELEARNING_API')).toBe(expected);
  });

  test.each([undefined, '', '   ', 'http://'])('has no localhost fallback for %p', (url) => {
    if (url === undefined) delete process.env.CORE_API_URL;
    else process.env.CORE_API_URL = url;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(configuredBaseUrl('CORE_API')).toBeUndefined();
    expect(() => baseUrl('CORE_API')).toThrow(new HttpError(502, 'The core service is unavailable.'));
  });

  test('forwards the caller session to the configured service', () => {
    process.env.USER_BFF_URL = 'http://bff-user:4000';

    expect(userBffOptions('Bearer abc')).toEqual({ baseURL: 'http://bff-user:4000', headers: { Authorization: 'Bearer abc' } });
    expect(asCaller('USER_BFF', 'Bearer abc')).toEqual(userBffOptions('Bearer abc'));
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
