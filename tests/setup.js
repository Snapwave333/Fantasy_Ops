// Test setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_PATH = ':memory:';

// Suppress console during tests
if (process.env.SUPPRESS_LOGS === 'true') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}
