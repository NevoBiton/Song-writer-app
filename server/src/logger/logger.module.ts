import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LokiTransport = require('winston-loki');

function buildTransports(): winston.transport[] {
  const isProd = process.env.NODE_ENV === 'production';

  const APP_NAME = 'WordChord';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProd
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.label({ label: APP_NAME }),
          )
        : winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const ctx = context ? ` [${context}]` : '';
              const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${APP_NAME}]${ctx} ${level}: ${message}${extra}`;
            }),
          ),
    }),
  ];

  const lokiHost = process.env.LOKI_HOST;
  const lokiBasicAuth = process.env.LOKI_BASIC_AUTH;
  if (lokiHost && lokiBasicAuth) {
    transports.push(
      new LokiTransport({
        host: lokiHost,
        basicAuth: lokiBasicAuth,
        labels: {
          app: 'wordchord',
          env: process.env.NODE_ENV ?? 'production',
        },
        json: true,
        format: winston.format.json(),
        replaceTimestamp: true,
        onConnectionError: (err: Error) =>
          console.error('[Loki] Connection error — logs may be lost:', err.message),
      }),
    );
  }

  return transports;
}

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: buildTransports(),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
