import { Controller, Get, Module } from '@nestjs/common';
import { Public } from '../auth/auth-context';

/**
 * Public endpoint so the frontend can discover the server's auth mode and use
 * the matching sign-in path — eliminating frontend/backend mismatches that
 * otherwise surface as "invalid or expired token".
 */
@Public()
@Controller('auth')
class AuthConfigController {
  @Get('config')
  config() {
    const supabaseUrl = process.env.SUPABASE_URL || null;
    const supabase = Boolean(process.env.SUPABASE_JWT_SECRET || supabaseUrl);
    return { supabase, supabaseUrl };
  }
}

@Module({ controllers: [AuthConfigController] })
export class AuthConfigModule {}
