import { describe, expect, it } from 'vitest'
import { PLAN_PROMPT } from '../src/lib/planPrompt'
import { PLAN_FORMAT, PLAN_VERSION } from './pack'

describe('the prompt for Claude', () => {
  it('asks for the format and version the checker expects', () => {
    expect(PLAN_PROMPT).toContain(`"format": "${PLAN_FORMAT}"`)
    expect(PLAN_PROMPT).toContain(`"version": ${PLAN_VERSION}`)
  })
  it('names every required top-level field', () => {
    for (const k of ['id', 'title', 'country', 'currency', 'visa', 'move', 'cities', 'tax', 'documents', 'steps', 'scenario']) expect(PLAN_PROMPT).toContain(`"${k}":`)
  })
})
