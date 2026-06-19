export type PlanId = 'starter' | 'growth' | 'pro' | 'enterprise'

export type Plan = {
  id: PlanId
  name: string
  price: string
  priceSuffix: string
  tagline: string
  highlight?: boolean
  cta: string
  aiModel: string
  features: string[]
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    priceSuffix: '/month',
    tagline: 'For individuals exploring their first project.',
    cta: 'Get started',
    aiModel: 'Claude Haiku',
    features: [
      '1 repository',
      'Architecture mapping',
      'Weekly scans',
      'Community support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$99',
    priceSuffix: '/month',
    tagline: 'For small teams shipping to production.',
    cta: 'Get started',
    aiModel: 'Claude Sonnet',
    features: [
      'Up to 10 repositories',
      'Daily scans',
      'Security posture (SAST + SCA)',
      'AI fixes with PR export',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$299',
    priceSuffix: '/month',
    tagline: 'For scaling orgs that need depth and speed.',
    highlight: true,
    cta: 'Get started',
    aiModel: 'Claude Opus',
    features: [
      'Unlimited repositories',
      'Continuous scans',
      'Full security suite + secrets + IaC',
      'Failure simulation',
      'Priority support & SSO',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceSuffix: '',
    tagline: 'For regulated teams with custom requirements.',
    cta: 'Contact sales',
    aiModel: 'Claude Opus + fine-tuning',
    features: [
      'Everything in Pro',
      'On-prem / VPC deployment',
      'Custom AI guardrails',
      'Dedicated success engineer',
      'Audit logs & compliance',
    ],
  },
]

export type FeatureRow = {
  label: string
  // value per plan: string renders text, true = check, false = dash
  values: Record<PlanId, string | boolean>
}

export type FeatureGroup = {
  category: string
  rows: FeatureRow[]
}

export const comparison: FeatureGroup[] = [
  {
    category: 'Usage & limits',
    rows: [
      {
        label: 'Repositories',
        values: { starter: '1', growth: '10', pro: 'Unlimited', enterprise: 'Unlimited' },
      },
      {
        label: 'Team members',
        values: { starter: '1', growth: 'Up to 15', pro: 'Up to 100', enterprise: 'Unlimited' },
      },
      {
        label: 'Scan frequency',
        values: { starter: 'Weekly', growth: 'Daily', pro: 'Continuous', enterprise: 'Continuous' },
      },
      {
        label: 'History retention',
        values: { starter: '7 days', growth: '90 days', pro: '1 year', enterprise: 'Custom' },
      },
    ],
  },
  {
    category: 'AI & remediation',
    rows: [
      {
        label: 'AI model',
        values: {
          starter: 'Claude Haiku',
          growth: 'Claude Sonnet',
          pro: 'Claude Opus',
          enterprise: 'Claude Opus + fine-tuning',
        },
      },
      {
        label: 'AI fix suggestions / month',
        values: { starter: '25', growth: '500', pro: 'Unlimited', enterprise: 'Unlimited' },
      },
      {
        label: 'One-click PR export',
        values: { starter: false, growth: true, pro: true, enterprise: true },
      },
      {
        label: 'AI assistant',
        values: { starter: 'Limited', growth: 'Standard', pro: 'Advanced', enterprise: 'Advanced + custom' },
      },
      {
        label: 'Custom AI guardrails',
        values: { starter: false, growth: false, pro: false, enterprise: true },
      },
    ],
  },
  {
    category: 'Security & analysis',
    rows: [
      {
        label: 'Architecture mapping',
        values: { starter: true, growth: true, pro: true, enterprise: true },
      },
      {
        label: 'Risk triage panel',
        values: { starter: true, growth: true, pro: true, enterprise: true },
      },
      {
        label: 'Static analysis (SAST)',
        values: { starter: false, growth: true, pro: true, enterprise: true },
      },
      {
        label: 'Dependency scanning (SCA)',
        values: { starter: false, growth: true, pro: true, enterprise: true },
      },
      {
        label: 'Secret scanning',
        values: { starter: false, growth: false, pro: true, enterprise: true },
      },
      {
        label: 'Infrastructure as Code (IaC)',
        values: { starter: false, growth: false, pro: true, enterprise: true },
      },
      {
        label: 'Failure simulation',
        values: { starter: false, growth: false, pro: true, enterprise: true },
      },
    ],
  },
  {
    category: 'Collaboration & support',
    rows: [
      {
        label: 'Support',
        values: { starter: 'Community', growth: 'Email', pro: 'Priority', enterprise: 'Dedicated engineer' },
      },
      {
        label: 'SSO / SAML',
        values: { starter: false, growth: false, pro: true, enterprise: true },
      },
      {
        label: 'Audit logs',
        values: { starter: false, growth: false, pro: 'Basic', enterprise: 'Advanced' },
      },
      {
        label: 'On-prem / VPC deployment',
        values: { starter: false, growth: false, pro: false, enterprise: true },
      },
      {
        label: 'SLA',
        values: { starter: false, growth: false, pro: '99.9%', enterprise: 'Custom' },
      },
    ],
  },
]
