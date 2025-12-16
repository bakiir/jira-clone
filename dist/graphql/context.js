"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = void 0;
const jwt_1 = require("../utils/jwt");
const createContext = ({ req }) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
        const decoded = (0, jwt_1.verifyToken)(token);
        if (decoded) {
            return { userId: decoded.userId };
        }
    }
    return {};
};
exports.createContext = createContext;
