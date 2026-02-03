import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // GRID API
  GRID_API_KEY: Joi.string().required(),
  GRID_GRAPHQL_ENDPOINT: Joi.string().uri().required(),
  GRID_SERIES_STATE_ENDPOINT: Joi.string().uri().required(),
  GRID_STATS_FEED_ENDPOINT: Joi.string().uri().required(),
  GRID_WS_ENDPOINT: Joi.string().uri().required(),

  // Cerebras API (optional - falls back to mock recommendations)
  CEREBRAS_API_KEY: Joi.string().optional(),
  CEREBRAS_MODEL: Joi.string().optional(), // e.g. llama-4-scout-17b-16e-instruct (default)

  // Application
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),

  // Database
  DATABASE_URL: Joi.string().optional(),
});
