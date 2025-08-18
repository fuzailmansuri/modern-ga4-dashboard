import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    // Google Analytics API Configuration (GA4)
    GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY: z.string().optional(),
    GOOGLE_ANALYTICS_PROPERTY_ID: z.string().optional(),
    GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
    GOOGLE_ANALYTICS_ACCOUNT_ID: z.string().optional(),
    GEMINI_API_KEY:
      process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    // Google Analytics API Configuration (GA4)
    GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY:
      process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY,
    GOOGLE_ANALYTICS_PROPERTY_ID: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
    GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_ANALYTICS_ACCOUNT_ID: process.env.GOOGLE_ANALYTICS_ACCOUNT_ID,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
