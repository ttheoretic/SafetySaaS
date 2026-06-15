'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { PageHeader, Card } from '@/components/ui';

export default function TeamPage() {
  const { token, hydrated } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  const members = useQuery({ queryKey: ['members'], queryFn: api.orgMembers, enabled: Boolean(token) });
  const invites = useQuery({ queryKey: ['invitations'], queryFn: api.listInvitations, enabled: Boolean(token) });

  const invite = useMutation({
    mutationFn: () => api.invite(email, role),
    onSuccess: () => {
      setEmail('');
      qc.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  if (!hydrated) return null;
  if (!token) {
    return (
      <>
        <PageHeader title="Team Management" subtitle="Roles, permissions and audit logs." />
        <Card>
          <p className="text-sm text-muted">
            <Link href="/login" className="text-accent hover:underline">Sign in</Link> to manage your team.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Team Management" subtitle="Members, roles and pending invitations." />

      <Card title="Invite a member" className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) invite.mutate();
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="flex-1 rounded-md border border-border bg-panel2 px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-border bg-panel2 px-2 py-2 text-sm text-white"
          >
            <option value="admin">admin</option>
            <option value="member">member</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            type="submit"
            disabled={invite.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {invite.isPending ? 'Inviting…' : 'Invite'}
          </button>
        </form>
        {invite.isError && <p className="mt-2 text-sm text-bad">{(invite.error as Error).message}</p>}
        {invite.isSuccess && (
          <p className="mt-2 text-xs text-muted">
            Invitation created — share token: <code className="text-slate-300">{invite.data.token}</code>
          </p>
        )}
      </Card>

      <Card title="Members" className="mb-6">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-border"><th className="py-2">Email</th><th>Name</th><th>Role</th></tr>
          </thead>
          <tbody>
            {members.data?.map((m) => (
              <tr key={m.userId} className="border-b border-border last:border-0">
                <td className="py-2 text-white">{m.email}</td>
                <td className="text-muted">{m.name ?? '—'}</td>
                <td className="capitalize">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {invites.data && invites.data.length > 0 && (
        <Card title="Pending invitations">
          <ul className="space-y-1 text-sm">
            {invites.data.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span className="text-slate-300">{i.email}</span>
                <span className="capitalize text-muted">{i.role}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
