"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const configSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    API_BASE_URL: zod_1.z.string().url().default("http://localhost:3000/api"),
    DATABASE_URL: zod_1.z.string().min(1),
    DIRECT_URL: zod_1.z.string().min(1),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_ANON_KEY: zod_1.z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default("15m"),
    REFRESH_TOKEN_SECRET: zod_1.z.string().min(32),
    REFRESH_TOKEN_EXPIRES_IN: zod_1.z.string().default("7d"),
    OPENAI_API_KEY: zod_1.z.string().min(1),
    OPENAI_MODEL: zod_1.z.string().default("gpt-4-turbo-preview"),
    OPENAI_MAX_TOKENS: zod_1.z.string().transform(Number).default("4000"),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().transform(Number).optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    FROM_EMAIL: zod_1.z.string().email().optional(),
    FROM_NAME: zod_1.z.string().optional(),
    ALLOWED_ORIGINS: zod_1.z
        .string()
        .default("http://localhost:3000,http://localhost:8000,https://knugget.com,chrome-extension://"),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default("900000"),
    RATE_LIMIT_MAX_REQUESTS_FREE: zod_1.z.string().transform(Number).default("10"),
    RATE_LIMIT_MAX_REQUESTS_PREMIUM: zod_1.z.string().transform(Number).default("100"),
    LOG_LEVEL: zod_1.z.enum(["error", "warn", "info", "debug"]).default("info"),
    LOG_FILE: zod_1.z.string().default("logs/app.log"),
    CREDITS_PER_SUMMARY: zod_1.z.string().transform(Number).default("1"),
    FREE_PLAN_MONTHLY_CREDITS: zod_1.z.string().transform(Number).default("10"),
    PREMIUM_PLAN_MONTHLY_CREDITS: zod_1.z.string().transform(Number).default("1000"),
});
const parsed = configSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(parsed.error.format());
    process.exit(1);
}
exports.config = {
    server: {
        nodeEnv: parsed.data.NODE_ENV,
        apiBaseUrl: parsed.data.API_BASE_URL,
    },
    database: {
        url: parsed.data.DATABASE_URL,
        directUrl: parsed.data.DIRECT_URL,
    },
    supabase: {
        url: parsed.data.SUPABASE_URL,
        anonKey: parsed.data.SUPABASE_ANON_KEY,
        serviceKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    },
    jwt: {
        secret: parsed.data.JWT_SECRET,
        expiresIn: parsed.data.JWT_EXPIRES_IN,
        refreshSecret: parsed.data.REFRESH_TOKEN_SECRET,
        refreshExpiresIn: parsed.data.REFRESH_TOKEN_EXPIRES_IN,
    },
    openai: {
        apiKey: parsed.data.OPENAI_API_KEY,
        model: parsed.data.OPENAI_MODEL,
        maxTokens: parsed.data.OPENAI_MAX_TOKENS,
    },
    email: {
        host: parsed.data.SMTP_HOST,
        port: parsed.data.SMTP_PORT,
        user: parsed.data.SMTP_USER,
        pass: parsed.data.SMTP_PASS,
        fromEmail: parsed.data.FROM_EMAIL,
        fromName: parsed.data.FROM_NAME,
    },
    cors: {
        allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
    },
    rateLimit: {
        windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
        maxRequestsFree: parsed.data.RATE_LIMIT_MAX_REQUESTS_FREE,
        maxRequestsPremium: parsed.data.RATE_LIMIT_MAX_REQUESTS_PREMIUM,
    },
    logging: {
        level: parsed.data.LOG_LEVEL,
        file: parsed.data.LOG_FILE,
    },
    credits: {
        perSummary: parsed.data.CREDITS_PER_SUMMARY,
        freeMonthly: parsed.data.FREE_PLAN_MONTHLY_CREDITS,
        premiumMonthly: parsed.data.PREMIUM_PLAN_MONTHLY_CREDITS,
    },
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map