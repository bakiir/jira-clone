"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express5_1 = require("@as-integrations/express5");
const http_1 = require("http");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const schema_1 = require("@graphql-tools/schema");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const typeDefs_1 = require("./graphql/typeDefs");
const resolvers_1 = require("./graphql/resolvers");
const context_1 = require("./graphql/context");
dotenv_1.default.config();
async function startServer() {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    // Connect to MongoDB
    await (0, db_1.connectDB)();
    // Create GraphQL schema
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: typeDefs_1.typeDefs, resolvers: resolvers_1.resolvers });
    // WebSocket server for subscriptions
    const wsServer = new ws_1.WebSocketServer({
        server: httpServer,
        path: "/graphql",
    });
    (0, ws_2.useServer)({ schema }, wsServer);
    // Apollo Server
    const server = new server_1.ApolloServer({
        schema,
    });
    await server.start();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // GraphQL endpoint
    app.use("/graphql", (0, express5_1.expressMiddleware)(server, {
        context: async ({ req }) => (0, context_1.createContext)({ req }), // <-- Используй getContext
    }));
    // Health check
    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
        console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/graphql`);
    });
}
startServer().catch(console.error);
