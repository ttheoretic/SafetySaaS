import { describe, it, expect, vi } from 'vitest';
import { AwsCollector } from './aws.collector';
import type { CollectorContext } from './collector';
import type { ConnectionRecord } from '../../store/store.module';

const conn = (metadata: Record<string, unknown>): ConnectionRecord =>
  ({ id: 'c', provider: 'aws', metadata } as unknown as ConnectionRecord);

const SG_XML = `<DescribeSecurityGroupsResponse><securityGroupInfo>
  <item>
    <groupId>sg-open</groupId>
    <groupName>web</groupName>
    <ipPermissions>
      <item>
        <ipProtocol>tcp</ipProtocol><fromPort>5432</fromPort><toPort>5432</toPort>
        <ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges>
      </item>
    </ipPermissions>
  </item>
  <item>
    <groupId>sg-safe</groupId>
    <groupName>internal</groupName>
    <ipPermissions>
      <item>
        <ipProtocol>tcp</ipProtocol><fromPort>443</fromPort><toPort>443</toPort>
        <ipRanges><item><cidrIp>10.0.0.0/8</cidrIp></item></ipRanges>
      </item>
    </ipPermissions>
  </item>
</securityGroupInfo></DescribeSecurityGroupsResponse>`;

const RDS_XML = `<DescribeDBInstancesResponse><DBInstances>
  <DBInstance><DBInstanceIdentifier>orders</DBInstanceIdentifier><Engine>postgres</Engine>
    <PubliclyAccessible>true</PubliclyAccessible><StorageEncrypted>false</StorageEncrypted></DBInstance>
  <DBInstance><DBInstanceIdentifier>internal</DBInstanceIdentifier><Engine>mysql</Engine>
    <PubliclyAccessible>false</PubliclyAccessible><StorageEncrypted>true</StorageEncrypted></DBInstance>
</DBInstances></DescribeDBInstancesResponse>`;

const ctxWith = (fetchImpl: typeof fetch): CollectorContext => ({ fetchImpl, token: 'secret' });

describe('AwsCollector', () => {
  it('flags world-open security groups and public/unencrypted RDS', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      const body = String(init?.body ?? '');
      const xml = body.includes('DescribeSecurityGroups') ? SG_XML : RDS_XML;
      return { ok: true, status: 200, text: async () => xml } as unknown as Response;
    }) as unknown as typeof fetch;

    const res = await new AwsCollector().collect(
      conn({ accessKeyId: 'AKID', region: 'eu-central-1' }),
      ctxWith(fetchImpl),
    );
    const titles = (res.findings ?? []).map((f) => f.title);

    // Open SG on a sensitive port (5432) → critical, the safe one is not flagged.
    expect(titles.some((t) => t.includes('sg-open') && t.includes('open to the internet'))).toBe(true);
    expect(titles.some((t) => t.includes('sg-safe'))).toBe(false);
    const sg = res.findings!.find((f) => f.title.includes('sg-open'))!;
    expect(sg.severity).toBe('critical');

    // RDS public + unencrypted on "orders"; "internal" clean.
    expect(titles.some((t) => t.includes('"orders" is publicly accessible'))).toBe(true);
    expect(titles.some((t) => t.includes('"orders" storage is not encrypted'))).toBe(true);
    expect(titles.some((t) => t.includes('internal'))).toBe(false);

    // RDS instances recorded as database nodes.
    expect(res.databases?.length).toBe(2);
  });

  it('does nothing without credentials', async () => {
    const res = await new AwsCollector().collect(conn({ region: 'us-east-1' }), {
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    expect(res.findings).toBeUndefined();
    expect(res.databases).toBeUndefined();
  });
});
