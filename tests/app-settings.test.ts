describe('app settings', () => {
  const saved = process.env.TRUST_PROXY;
  afterEach(() => {
    if (saved === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = saved;
    jest.resetModules();
  });

  test.each([
    [undefined, false],
    ['1', 1],
    ['true', true],
    ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
  ])('reads TRUST_PROXY=%p into the Express trust proxy setting', async (value, expected) => {
    if (value === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = value;

    const { default: app } = await import('../src/app');

    expect(app.get('trust proxy')).toBe(expected);
  });
});
