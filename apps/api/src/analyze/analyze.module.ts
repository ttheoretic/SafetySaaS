import { Body, Controller, Module, Post } from '@nestjs/common';
import { AnalyzeService } from './analyze.service';
import { AnalyzeDto, SimulateDto } from './dto';
import type { SystemGraph, SimulationParams } from '@failsafe/shared';

@Controller('analyze')
class AnalyzeController {
  constructor(private readonly analyze: AnalyzeService) {}

  @Post('reliability')
  reliability(@Body() dto: AnalyzeDto) {
    return this.analyze.reliability(dto.graph as unknown as SystemGraph);
  }

  @Post('security')
  security(@Body() dto: AnalyzeDto) {
    return this.analyze.security(dto.graph as unknown as SystemGraph);
  }

  @Post('simulate')
  simulate(@Body() dto: SimulateDto) {
    return this.analyze.simulate(
      dto.graph as unknown as SystemGraph,
      dto.type,
      (dto.params as SimulationParams) ?? {},
      dto.business,
      dto.durationHours ?? 1,
    );
  }

  @Post('report')
  report(@Body() dto: SimulateDto) {
    return this.analyze.fullReport(
      dto.graph as unknown as SystemGraph,
      dto.business,
    );
  }
}

@Module({
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
  exports: [AnalyzeService],
})
export class AnalyzeModule {}
