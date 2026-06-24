import { NodeInventory } from '@/components/inventory/node-inventory'

export default function ServicesPage() {
  return (
    <NodeInventory
      title="Services"
      subtitle="services & endpoints"
      kinds={['frontend', 'api', 'service', 'external_api', 'cdn', 'dns']}
      emptyHint="Connect a repository and run a scan — Riscly maps your services from code and configuration into a live inventory."
    />
  )
}
