import path from 'path';

export default ({ env }) => {
  const client = env('STRAPI_DATABASE_CLIENT', env('DATABASE_CLIENT', 'sqlite'));

  const connections = {
    mysql: {
      connection: {
        host: env('STRAPI_DATABASE_HOST', env('DATABASE_HOST', 'localhost')),
        port: env.int('STRAPI_DATABASE_PORT', env.int('DATABASE_PORT', 3306)),
        database: env('STRAPI_DATABASE_NAME', env('DATABASE_NAME', 'strapi')),
        user: env('STRAPI_DATABASE_USERNAME', env('DATABASE_USERNAME', 'strapi')),
        password: env('STRAPI_DATABASE_PASSWORD', env('DATABASE_PASSWORD', 'strapi')),
        ssl: env.bool('STRAPI_DATABASE_SSL', env.bool('DATABASE_SSL', false)) && {
          key: env('STRAPI_DATABASE_SSL_KEY', env('DATABASE_SSL_KEY', undefined)),
          cert: env('STRAPI_DATABASE_SSL_CERT', env('DATABASE_SSL_CERT', undefined)),
          ca: env('STRAPI_DATABASE_SSL_CA', env('DATABASE_SSL_CA', undefined)),
          capath: env('STRAPI_DATABASE_SSL_CAPATH', env('DATABASE_SSL_CAPATH', undefined)),
          cipher: env('STRAPI_DATABASE_SSL_CIPHER', env('DATABASE_SSL_CIPHER', undefined)),
          rejectUnauthorized: env.bool(
            'STRAPI_DATABASE_SSL_REJECT_UNAUTHORIZED',
            env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true)
          ),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        connectionString: env('STRAPI_DATABASE_URL', env('DATABASE_URL')),
        host: env('STRAPI_DATABASE_HOST', env('DATABASE_HOST', 'localhost')),
        port: env.int('STRAPI_DATABASE_PORT', env.int('DATABASE_PORT', 5432)),
        database: env('STRAPI_DATABASE_NAME', env('DATABASE_NAME', 'strapi')),
        user: env('STRAPI_DATABASE_USERNAME', env('DATABASE_USERNAME', 'strapi')),
        password: env('STRAPI_DATABASE_PASSWORD', env('DATABASE_PASSWORD', 'strapi')),
        ssl: env.bool('STRAPI_DATABASE_SSL', env.bool('DATABASE_SSL', false)) && {
          key: env('STRAPI_DATABASE_SSL_KEY', env('DATABASE_SSL_KEY', undefined)),
          cert: env('STRAPI_DATABASE_SSL_CERT', env('DATABASE_SSL_CERT', undefined)),
          ca: env('STRAPI_DATABASE_SSL_CA', env('DATABASE_SSL_CA', undefined)),
          capath: env('STRAPI_DATABASE_SSL_CAPATH', env('DATABASE_SSL_CAPATH', undefined)),
          cipher: env('STRAPI_DATABASE_SSL_CIPHER', env('DATABASE_SSL_CIPHER', undefined)),
          rejectUnauthorized: env.bool(
            'STRAPI_DATABASE_SSL_REJECT_UNAUTHORIZED',
            env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true)
          ),
        },
        schema: env('STRAPI_DATABASE_SCHEMA', env('DATABASE_SCHEMA', 'public')),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
