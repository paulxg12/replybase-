import { z } from "zod";
const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),
    OPENAI_API_KEY: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_PRICE_ID_STARTER: z.string(),
    STRIPE_PRICE_ID_GROWTH: z.string(),
    STRIPE_PRICE_ID_SCALE: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    AWS_S3_BUCKET: z.string(),
    RESEND_API_KEY: z.string(),
    DD_API_KEY: z.string().optional(),
    DD_SERVICE: z.string().optional(),
    APP_URL: z.string().url(),
    API_URL: z.string().url(),
    ENCRYPTION_KEY: z.string().min(64).max(64), // 32 bytes in hex = 64 chars
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});
export function validateEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error("❌ Invalid environment variables:");
        parsed.error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        });
        process.exit(1);
    }
    return parsed.data;
}
