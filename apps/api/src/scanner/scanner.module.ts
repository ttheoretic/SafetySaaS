import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { PROVIDER_COLLECTORS } from './collectors/collector';
import { GithubCollector } from './collectors/github.collector';
import { VercelCollector } from './collectors/vercel.collector';
import { StripeCollector } from './collectors/stripe.collector';
import { MetadataCollector } from './collectors/metadata.collector';

/**
 * Provider-specific collectors. To add a new live integration, implement a
 * ProviderCollector and register it here — the scanner picks it up by its
 * `provider` id, and anything without a collector falls back to MetadataCollector.
 */
@Module({
  providers: [
    ScannerService,
    GithubCollector,
    VercelCollector,
    StripeCollector,
    MetadataCollector,
    {
      provide: PROVIDER_COLLECTORS,
      useFactory: (...collectors: ProviderCollectorList) => collectors,
      inject: [GithubCollector, VercelCollector, StripeCollector],
    },
  ],
  exports: [ScannerService],
})
export class ScannerModule {}

type ProviderCollectorList = [GithubCollector, VercelCollector, StripeCollector];
