import 'reflect-metadata';
import { validate } from './environment-variables';

describe('environment validation', () => {
  const complete: Record<string, string> = {
    PORT: '4000',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'cinema',
    DB_PASSWORD: 'cinema',
    DB_NAME: 'cinema',
  };

  const without = (name: string): Record<string, string> =>
    Object.fromEntries(
      Object.entries(complete).filter(([key]) => key !== name),
    );

  it('accepts a complete configuration and converts numbers', () => {
    const config = validate(complete);

    expect(config.PORT).toBe(4000);
    expect(config.DB_PORT).toBe(5432);
    expect(config.DB_HOST).toBe('localhost');
  });

  it('falls back to port 3000 when PORT is not set', () => {
    expect(validate(without('PORT')).PORT).toBe(3000);
  });

  it.each(['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'])(
    'refuses to start without %s',
    (name) => {
      expect(() => validate(without(name))).toThrow(name);
    },
  );

  it('refuses a value that is empty or of a wrong type', () => {
    expect(() => validate({ ...complete, DB_HOST: '' })).toThrow('DB_HOST');
    expect(() => validate({ ...complete, DB_PORT: 'abc' })).toThrow('DB_PORT');
    expect(() => validate({ ...complete, PORT: '70000' })).toThrow('PORT');
  });
});
