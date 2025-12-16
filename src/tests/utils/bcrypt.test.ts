import { hashPassword, comparePassword } from '../../utils/bcrypt';

describe('Bcrypt Utility', () => {
  it('should hash a password', async () => {
    const password = 'mySecretPassword';
    const hashedPassword = await hashPassword(password);

    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword.length).toBeGreaterThan(0);
    expect(hashedPassword).not.toBe(password); // The hash should not be the same as the original password
  });

  it('should compare a password with its hash and return true for a match', async () => {
    const password = 'mySecretPassword';
    const hashedPassword = await hashPassword(password);
    const isMatch = await comparePassword(password, hashedPassword);

    expect(isMatch).toBe(true);
  });

  it('should compare a password with its hash and return false for a non-match', async () => {
    const password = 'mySecretPassword';
    const wrongPassword = 'wrongPassword';
    const hashedPassword = await hashPassword(password);
    const isMatch = await comparePassword(wrongPassword, hashedPassword);

    expect(isMatch).toBe(false);
  });

  it('should return false for an invalid hash format', async () => {
    const password = 'mySecretPassword';
    const invalidHash = 'invalidHashFormat';
    const isMatch = await comparePassword(password, invalidHash);

    expect(isMatch).toBe(false);
  });
});
