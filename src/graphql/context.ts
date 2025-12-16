import { verifyToken } from "../utils/jwt";

export interface Context {
  userId?: string;
}

export const createContext = ({ req }: any): Context => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      return { userId: decoded.userId };
    }
  }

  return {};
};
