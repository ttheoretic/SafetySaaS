import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, DatabaseSignals, Finding, Severity } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch } from './collector';
import { signRequest, amzDateNow } from './aws-sigv4';

// Ports that must never be open to the public internet.
const SENSITIVE_PORTS = new Set([22, 3389, 5432, 3306, 6379, 27017, 9200, 9300, 1433, 5984, 11211]);

/** Split the depth-0 <item>…</item> blocks inside <container>…</container>,
 *  ignoring nested items (EC2's deeply-nested query XML). */
function topLevelItems(xml: string, container: string): string[] {
  const open = `<${container}>`;
  const start = xml.indexOf(open);
  if (start < 0) return [];
  const end = xml.indexOf(`</${container}>`, start);
  const inner = xml.slice(start + open.length, end < 0 ? undefined : end);
  const items: string[] = [];
  const re = /<item>|<\/item>/g;
  let depth = 0;
  let from = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    if (m[0] === '<item>') {
      if (depth === 0) from = m.index + m[0].length;
      depth++;
    } else if (depth > 0) {
      depth--;
      if (depth === 0) items.push(inner.slice(from, m.index));
    }
  }
  return items;
}

const tag = (xml: string, name: string): string | undefined => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : undefined;
};

/**
 * AWS collector (read-only) via signed query-protocol calls. Reads the real,
 * auditable configuration in the configured region and flags the classic high-
 * impact exposures: security groups open to 0.0.0.0/0 and RDS instances that are
 * publicly accessible or unencrypted. Credentials: secret key as the connection
 * token; access key id + region (+ optional session token) in metadata.
 */
@Injectable()
export class AwsCollector implements ProviderCollector {
  readonly provider = 'aws';
  private readonly logger = new Logger(AwsCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const accessKeyId = typeof meta.accessKeyId === 'string' ? meta.accessKeyId : undefined;
    const region = (typeof meta.region === 'string' && meta.region) || 'us-east-1';
    const sessionToken = typeof meta.sessionToken === 'string' ? meta.sessionToken : undefined;
    if (!ctx.token || !accessKeyId) return {};

    const creds = { accessKeyId, secretAccessKey: ctx.token, sessionToken, region };
    const findings: Finding[] = [];
    let databases: DatabaseSignals[] = [];

    const sg = await this.call('ec2', `ec2.${region}.amazonaws.com`, 'Action=DescribeSecurityGroups&Version=2016-11-15', creds, ctx);
    if (sg) findings.push(...this.auditSecurityGroups(sg, region));

    const rds = await this.call('rds', `rds.${region}.amazonaws.com`, 'Action=DescribeDBInstances&Version=2014-10-31', creds, ctx);
    if (rds) {
      const out = this.auditRds(rds, region);
      findings.push(...out.findings);
      databases = out.databases;
    }

    return {
      ...(databases.length ? { databases } : {}),
      ...(findings.length ? { findings } : {}),
    };
  }

  private async call(
    service: string,
    host: string,
    body: string,
    creds: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region: string },
    ctx: CollectorContext,
  ): Promise<string | undefined> {
    try {
      const headers = signRequest({
        method: 'POST',
        host,
        body,
        service,
        region: creds.region,
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        amzDate: amzDateNow(),
      });
      const res = await resilientFetch(ctx.fetchImpl, `https://${host}/`, { method: 'POST', headers, body });
      if (!res.ok) {
        this.logger.warn(`AWS ${service} call returned ${res.status}`);
        return undefined;
      }
      return await res.text();
    } catch (err) {
      this.logger.warn(`AWS ${service} call failed: ${(err as Error).message}`);
      return undefined;
    }
  }

  private auditSecurityGroups(xml: string, region: string): Finding[] {
    const findings: Finding[] = [];
    for (const group of topLevelItems(xml, 'securityGroupInfo')) {
      const groupId = tag(group, 'groupId') ?? 'unknown';
      const groupName = tag(group, 'groupName') ?? groupId;
      const perms = group.slice(group.indexOf('<ipPermissions>'), group.indexOf('</ipPermissions>') + 1);
      const openPorts: string[] = [];
      let sensitive = false;
      for (const rule of topLevelItems(perms, 'ipPermissions')) {
        if (!rule.includes('0.0.0.0/0')) continue;
        const proto = tag(rule, 'ipProtocol');
        const from = tag(rule, 'fromPort');
        const to = tag(rule, 'toPort');
        if (proto === '-1' || from === undefined) {
          openPorts.push('all');
          sensitive = true;
        } else {
          const f = Number(from);
          const t = Number(to ?? from);
          openPorts.push(f === t ? `${f}` : `${f}-${t}`);
          for (const p of SENSITIVE_PORTS) if (p >= f && p <= t) sensitive = true;
        }
      }
      if (openPorts.length === 0) continue;
      findings.push({
        category: 'security',
        severity: (sensitive ? 'critical' : 'high') as Severity,
        title: `AWS security group ${groupName} (${groupId}) is open to the internet`,
        description:
          `Ingress from 0.0.0.0/0 on port(s) ${openPorts.join(', ')} in ${region}. ${sensitive ? 'This exposes a sensitive/admin port to the entire internet. ' : ''}Restrict the source to known IP ranges or a security group.`,
        weight: sensitive ? 22 : 14,
      });
    }
    return findings;
  }

  private auditRds(xml: string, region: string): { databases: DatabaseSignals[]; findings: Finding[] } {
    const databases: DatabaseSignals[] = [];
    const findings: Finding[] = [];
    const blocks = xml.match(/<DBInstance>[\s\S]*?<\/DBInstance>/g) ?? [];
    for (const b of blocks) {
      const id = tag(b, 'DBInstanceIdentifier') ?? 'rds';
      const engine = tag(b, 'Engine');
      const isPublic = tag(b, 'PubliclyAccessible') === 'true';
      const encrypted = tag(b, 'StorageEncrypted') === 'true';
      databases.push({ provider: 'aws', name: `${id}${engine ? ` (${engine})` : ''}`, region, hasBackup: true });
      if (isPublic) {
        findings.push({
          category: 'security',
          severity: 'critical',
          title: `AWS RDS "${id}" is publicly accessible`,
          description: `The RDS instance "${id}" in ${region} has PubliclyAccessible=true, so it is reachable from the public internet. Disable public accessibility and place it in a private subnet.`,
          weight: 22,
        });
      }
      if (!encrypted) {
        findings.push({
          category: 'security',
          severity: 'high',
          title: `AWS RDS "${id}" storage is not encrypted`,
          description: `The RDS instance "${id}" in ${region} has StorageEncrypted=false. Enable encryption at rest (a snapshot-restore is required for existing instances).`,
          weight: 14,
        });
      }
    }
    return { databases, findings };
  }
}
