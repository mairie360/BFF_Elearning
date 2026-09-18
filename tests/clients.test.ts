import coreClient from '../src/clients/coreClient';
import elearningClient from '../src/clients/elearningClient';

describe('API clients', () => {
  it('builds the Core API client from the generated openapi package', () => {
    expect(coreClient).toBeDefined();
    expect(typeof coreClient).toBe('object');
  });

  it('builds the E-learning API client from the generated openapi package', () => {
    expect(elearningClient).toBeDefined();
    expect(typeof elearningClient).toBe('object');
  });
});
