/**
 * OpenTelemetry bootstrap. Imported first in main.ts / worker.ts so HTTP,
 * Express and outbound calls are auto-instrumented and traces flow to an OTLP
 * collector. A no-op unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so local dev
 * and tests are unaffected.
 *
 * Trace context propagates from the API through the job queue into the worker,
 * giving end-to-end traces across the request and work paths.
 */
import { Logger } from '@nestjs/common';

let started = false;

export function startTracing(serviceName = 'failsafe-api'): void {
  if (started) return;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  try {
    // Required lazily so the heavy SDK only loads when tracing is enabled.
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const {
      getNodeAutoInstrumentations,
    } = require('@opentelemetry/auto-instrumentations-node');
    const {
      OTLPTraceExporter,
    } = require('@opentelemetry/exporter-trace-otlp-http');

    const sdk = new NodeSDK({
      serviceName,
      traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();
    started = true;
    Logger.log(`OpenTelemetry tracing → ${endpoint}`, 'Tracing');

    const shutdown = () => sdk.shutdown().finally(() => process.exit(0));
    process.on('SIGTERM', shutdown);
  } catch (err) {
    Logger.warn(
      `Tracing not started (${(err as Error).message}). ` +
        'Install the @opentelemetry/* packages to enable it.',
      'Tracing',
    );
  }
}
