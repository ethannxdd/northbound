// The paperwork for an Ancestry visa, in the order you'll usually get it.

import type { ScenarioInput } from './types'

export type DocStatus = 'todo' | 'ordered' | 'arrived' | 'checked'

export interface DocDef {
  key: string
  name: string
  from: string
  /** What "checked" means for this document */
  check: string
  /** Map step this document completes, and the status it needs to reach */
  task?: { key: string; when: DocStatus }
  /** Documents that only some people need */
  optional?: string
}

export const DOCUMENTS: DocDef[] = [
  { key: 'my-birth', name: 'Your unabridged birth certificate', from: 'Home Affairs', check: "Both parents' names are on it", task: { key: 'sa-certs', when: 'ordered' } },
  { key: 'dad-birth', name: "Your dad's unabridged birth certificate", from: 'Home Affairs', check: "Your gran's name matches her birth certificate", task: { key: 'sa-certs', when: 'ordered' } },
  { key: 'gran-birth', name: "Gran's birth certificate", from: 'GRO (England and Wales)', check: 'Born in the UK, and her name matches', task: { key: 'gro-cert', when: 'ordered' } },
  { key: 'gran-marriage', name: "Gran's marriage certificate", from: 'GRO or Home Affairs', check: 'Links her maiden and married names', task: { key: 'gran-marriage', when: 'ordered' }, optional: 'Only if her surname changed' },
  { key: 'passport', name: 'Passport', from: 'Home Affairs', check: 'Valid for 6 months after you land', task: { key: 'passport', when: 'checked' } },
  { key: 'tb', name: 'TB test certificate', from: 'Approved clinic', check: 'Dated within 6 months of applying', task: { key: 'tb-test', when: 'arrived' } },
  { key: 'statements', name: 'Bank statements', from: 'Your bank', check: 'Dated within 31 days of applying, showing the full amount', task: { key: 'proof-funds', when: 'arrived' } },
]

export const STATUS_ORDER: DocStatus[] = ['todo', 'ordered', 'arrived', 'checked']
export const STATUS_LABEL: Record<DocStatus, string> = { todo: 'To do', ordered: 'Ordered', arrived: 'Arrived', checked: 'Checked' }

export function atLeast(s: DocStatus | undefined, min: DocStatus): boolean {
  return STATUS_ORDER.indexOf(s ?? 'todo') >= STATUS_ORDER.indexOf(min)
}

/** Map steps that the paperwork tracker shows as done. A step needs every document linked to it, except removed ones. */
export function tasksDoneByDocs(statuses: Record<string, DocStatus>, hidden: string[] = []): Set<string> {
  const byTask = new Map<string, DocDef[]>()
  for (const d of DOCUMENTS) if (d.task && !hidden.includes(`doc:${d.key}`)) byTask.set(d.task.key, [...(byTask.get(d.task.key) ?? []), d])
  const out = new Set<string>()
  for (const [task, docs] of byTask) if (docs.every((d) => atLeast(statuses[d.key], d.task!.when))) out.add(task)
  return out
}

/** One document to track on a scenario: the UK list, an imported plan's, or one Claude's details file adds. */
export interface ScenarioDoc extends DocDef {
  /** How details files and the removed list refer to it: "doc:<key>" */
  ref: string
  /** A cost in words, from the plan or the details file */
  cost?: string
  takes?: string
  url?: string
  /** Added by Claude's details file */
  added?: boolean
}

type Money = (n: number, currency: 'ZAR' | 'local' | undefined) => string

/** Every document for the scenario, including removed ones. Filter with `hidden` to get what's on the list. */
export function scenarioDocuments(s: ScenarioInput, money: Money): ScenarioDoc[] {
  const pack = s.pack
  const base: ScenarioDoc[] = pack
    ? pack.documents.map((d) => ({
        key: `${pack.id}:${d.key}`,
        ref: `doc:${d.key}`,
        name: d.name,
        from: d.from,
        check: d.check,
        optional: d.optional,
        url: d.url,
        takes: d.takes,
        cost: d.cost ? money(d.cost, d.costCurrency) : undefined,
      }))
    : DOCUMENTS.map((d) => ({ ...d, ref: `doc:${d.key}` }))
  const added: ScenarioDoc[] = (s.details?.addDocuments ?? []).map((d) => ({
    key: `added-${d.key}`,
    ref: `doc:added-${d.key}`,
    name: d.name,
    from: d.from,
    check: d.check,
    optional: d.optional,
    url: d.url,
    takes: d.takes,
    cost: d.cost ? money(d.cost, d.costCurrency) : undefined,
    added: true,
  }))
  return [...base, ...added]
}

export function visibleDocuments(s: ScenarioInput, money: Money): ScenarioDoc[] {
  const hidden = new Set(s.hidden ?? [])
  return scenarioDocuments(s, money).filter((d) => !hidden.has(d.ref))
}
