export type CodeLine = {
  n: number
  text: string
  issue?: boolean
}

export type CodeFile = {
  id: string
  path: string
  name: string
  lang: string
  issueCount: number
  severity: 'critical' | 'high' | 'medium' | 'low' | 'ok'
  lines: CodeLine[]
  issue?: {
    line: number
    rule: string
    title: string
    severity: 'critical' | 'high' | 'medium'
    explanation: string[]
    diff: { before: string[]; after: string[]; startLine: number }
  }
}

export const fileTree: CodeFile[] = [
  {
    id: 'dogmover',
    path: 'scripts/dogmover/',
    name: 'dogmover.py',
    lang: 'python',
    issueCount: 1,
    severity: 'critical',
    lines: [
      { n: 314, text: 'def push_synthetics(self, data, count):' },
      { n: 315, text: '    options = self.options' },
      { n: 316, text: '    print("Pushing {}".format(data["name"].encode(\'utf8\')))' },
      { n: 317, text: '    if not arguments["--dry-run"]:' },
      {
        n: 318,
        text: "        r = requests.post('{}api/v1/synthetics/tests?api_key={}&application_key={}'.format(options['api_host'], options['api_key'], options['app_key']), json=data)",
        issue: true,
      },
      { n: 319, text: '    print("Pushed \'{}\' synthetic tests.".format(count))' },
      { n: 320, text: '    return r' },
    ],
    issue: {
      line: 318,
      rule: 'python-security/requests-timeout',
      title: 'timeout not defined',
      severity: 'critical',
      explanation: [
        'At line 318, add a timeout parameter to the requests.post call, e.g. timeout=10.',
        'Add timeout parameters to all other requests.get and requests.post calls so every remote call is bounded.',
        'Wrap requests in try/except to handle requests.exceptions.Timeout gracefully.',
        'Choose a value (5–10s) based on expected API responsiveness.',
        'This prevents the worker from hanging indefinitely when the API is unresponsive.',
      ],
      diff: {
        startLine: 318,
        before: [
          "        r = requests.post('{}api/v1/synthetics/tests?api_key={}&",
          "            application_key={}'.format(options['api_host'],",
          "            options['api_key'], options['app_key']), json=data)",
        ],
        after: [
          "        r = requests.post('{}api/v1/synthetics/tests?api_key={}&",
          "            application_key={}'.format(options['api_host'],",
          "            options['api_key'], options['app_key']), json=data,",
          '            timeout=10)',
        ],
      },
    },
  },
  {
    id: 'rds',
    path: 'infra/terraform/',
    name: 'rds.tf',
    lang: 'hcl',
    issueCount: 1,
    severity: 'critical',
    lines: [],
  },
  {
    id: 'keys',
    path: 'src/config/',
    name: 'keys.py',
    lang: 'python',
    issueCount: 1,
    severity: 'high',
    lines: [],
  },
  {
    id: 'history',
    path: 'services/orders/',
    name: 'history.ts',
    lang: 'typescript',
    issueCount: 1,
    severity: 'high',
    lines: [],
  },
  {
    id: 'routes',
    path: 'services/auth/',
    name: 'routes.ts',
    lang: 'typescript',
    issueCount: 1,
    severity: 'high',
    lines: [],
  },
]
