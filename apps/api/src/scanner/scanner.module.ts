import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { PROVIDER_COLLECTORS } from './collectors/collector';
import { GithubCollector } from './collectors/github.collector';
import { GitlabCollector } from './collectors/gitlab.collector';
import { VercelCollector } from './collectors/vercel.collector';
import { StripeCollector } from './collectors/stripe.collector';
import { RenderCollector } from './collectors/render.collector';
import { NeonCollector } from './collectors/neon.collector';
import { SupabaseCollector } from './collectors/supabase.collector';
import { MetadataCollector } from './collectors/metadata.collector';

/**
 * Provider-specific collectors. To add a new live integration, implement a
 * ProviderCollector and register it here — the scanner picks it up by its
 * `provider` id, and anything without a collector falls back to MetadataCollector.
 */
const COLLECTORS = [
  GithubCollector,
  GitlabCollector,
  VercelCollector,
  StripeCollector,
  RenderCollector,
  NeonCollector,
  SupabaseCollector,
];

@Module({
  providers: [
    ScannerService,
    ...COLLECTORS,
    MetadataCollector,
    {
      provide: PROVIDER_COLLECTORS,
      useFactory: (...collectors) => collectors,
      inject: COLLECTORS,
    },
  ],
  exports: [ScannerService],
})
export class ScannerModule {}
