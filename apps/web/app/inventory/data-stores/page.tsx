import { NodeInventory } from '@/components/inventory/node-inventory'

export default function DataStoresPage() {
  return (
    <NodeInventory
      title="Data Stores"
      subtitle="databases, caches & queues"
      kinds={['database', 'cache', 'queue', 'storage']}
      emptyHint="Connect a repository and run a scan — your databases, caches, queues and storage appear here with their backup and redundancy posture."
    />
  )
}
