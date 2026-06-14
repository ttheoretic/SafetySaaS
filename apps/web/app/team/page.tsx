import { PageHeader, Card } from '@/components/ui';

const MEMBERS = [
  { name: 'Theo Handschug', email: 'theo@acme.io', role: 'owner' },
  { name: 'Dana Ops', email: 'dana@acme.io', role: 'admin' },
  { name: 'Sam Dev', email: 'sam@acme.io', role: 'member' },
  { name: 'Auditor', email: 'audit@acme.io', role: 'viewer' },
];

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Team Management"
        subtitle="Roles, permissions and audit logs for your organization."
      />
      <Card title="Members">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-border">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((m) => (
              <tr key={m.email} className="border-b border-border last:border-0">
                <td className="py-2 text-white">{m.name}</td>
                <td className="text-muted">{m.email}</td>
                <td className="capitalize">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
