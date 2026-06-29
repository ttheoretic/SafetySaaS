import { describe, it, expect, vi } from 'vitest';
import { NotFoundException, ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  const req = { method: 'GET', url: '/x' };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('passes through HTTP exceptions with their real status', () => {
    const { host, res } = mockHost();
    filter.catch(new NotFoundException('Project not found'), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Project not found' }),
    );
  });

  it('degrades Prisma-style DB errors to 503', () => {
    const { host, res } = mockHost();
    const err = Object.assign(new Error('table missing'), { code: 'P2021' });
    filter.catch(err, host);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('sanitizes unknown errors to a 500 without leaking the message', () => {
    const { host, res } = mockHost();
    filter.catch(new Error('secret internal detail: token=abc'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('secret internal detail');
    expect(body.requestId).toBeTruthy();
  });
});
