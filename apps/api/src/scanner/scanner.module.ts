import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { GithubCollector } from './collectors/github.collector';
import { MetadataCollector } from './collectors/metadata.collector';

@Module({
  providers: [ScannerService, GithubCollector, MetadataCollector],
  exports: [ScannerService],
})
export class ScannerModule {}
