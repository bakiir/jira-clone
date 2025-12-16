import { generateToken, verifyToken } from '../../utils/jwt';
import jwt from 'jsonwebtoken';

// Mock the JWT_SECRET for consistent testing
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

describe('JWT Utility', () => {
  it('should generate a valid token', () => {
    const userId = 'testUserId';
    const token = generateToken(userId);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    // Optionally, verify the token immediately to ensure it's well-formed
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, iat: number, exp: number };
    expect(decoded.userId).toBe(userId);
  });

  it('should verify a valid token and return the payload', () => {
    const userId = 'testUserId';
    const token = generateToken(userId);
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded.userId).toBe(userId);
  });

  it('should return null for an invalid token', () => {
    const invalidToken = 'invalid.token.string';
    const decoded = verifyToken(invalidToken);
    expect(decoded).toBeNull();
  });

  it('should return null for a token signed with a different secret', () => {
    const userId = 'testUserId';
    const token = jwt.sign({ userId }, 'different-secret', { expiresIn: '1h' });
    const decoded = verifyToken(token);
    expect(decoded).toBeNull();
  });

  it('should return null for an expired token', () => {
    const userId = 'testUserId';
    // Generate a token that expires immediately
    const expiredToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '0s' });

    // Wait a moment for the token to expire
    return new Promise((resolve) => {
      setTimeout(() => {
        const decoded = verifyToken(expiredToken);
        expect(decoded).toBeNull();
        resolve(null);
      }, 1000); // Wait 1 second
    });
  });
});
