import {
  Controller,
  Get,
  Module,
  Param,
  Query,
} from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { GithubService } from './github.service';

@Controller('projects/:projectId')
class GithubController {
  constructor(private readonly github: GithubService) {}

  /** Recent commits across the project's connected GitHub repos. */
  @Get('commits')
  @RequirePermission('project:read')
  commits(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit) || 10, 1), 30);
    return this.github.listCommits(projectId, auth.org.id, n);
  }

  /** The file tree (blob paths) for a repo, for the code explorer. */
  @Get('files')
  @RequirePermission('project:read')
  async files(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Query('repo') repo?: string,
  ) {
    const repos = await this.github.listRepos(projectId, auth.org.id);
    const target = repo && repos.includes(repo) ? repo : repos[0];
    if (!target) return { repo: null, repos, files: [] };
    const files = await this.github.listFiles(projectId, auth.org.id, target);
    return { repo: target, repos, files };
  }

  /** Raw UTF-8 content of a single file. */
  @Get('files/content')
  @RequirePermission('project:read')
  async fileContent(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Query('repo') repo: string,
    @Query('path') path: string,
  ) {
    const content = await this.github.readFile(
      projectId,
      auth.org.id,
      repo,
      path,
    );
    return { repo, path, content };
  }
}

@Module({
  imports: [StoreModule],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
