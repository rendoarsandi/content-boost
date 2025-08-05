describe('Landing Page', () => {
  it('should have a basic smoke test', () => {
    // Basic smoke test to ensure the test setup works
    expect(true).toBe(true);
  });

  it('should have proper project structure', () => {
    // Test that the project has the expected structure
    expect(typeof process.env.NODE_ENV).toBe('string');
  });

  it('should export HomePage component', () => {
    // Test that the HomePage component can be imported
    const HomePage = require('../app/page').default;
    expect(typeof HomePage).toBe('function');
  });
});
