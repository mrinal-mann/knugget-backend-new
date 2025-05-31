"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const index_1 = require("./index");
const createPrismaClient = () => {
    return new client_1.PrismaClient({
        log: index_1.config.server.nodeEnv === "development"
            ? ["query", "error", "warn"]
            : ["error"],
        errorFormat: "pretty",
    });
};
exports.prisma = globalThis.__prisma ?? createPrismaClient();
if (index_1.config.server.nodeEnv === "development") {
    globalThis.__prisma = exports.prisma;
}
process.on("beforeExit", async () => {
    await exports.prisma.$disconnect();
});
process.on("SIGINT", async () => {
    await exports.prisma.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await exports.prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=database.js.map