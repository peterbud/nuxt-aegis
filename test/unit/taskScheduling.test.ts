import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import type { NuxtOptions } from '@nuxt/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const cleanupTasks = [
  'cleanup:auth-codes',
  'cleanup:refresh-tokens',
  'cleanup:magic-codes',
  'cleanup:reset-sessions',
]
const daily = '0 2 * * *'
const custom = '0 */6 * * *'

describe('cleanup task scheduling', () => {
  let nuxt: Awaited<ReturnType<typeof loadNuxt>>
  let resolvedConfig: NuxtOptions['nitro']
  let resolvedSchedules: NonNullable<NuxtOptions['nitro']['scheduledTasks']>

  beforeAll(async () => {
    nuxt = await loadNuxt({
      cwd: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
      ready: false,
      overrides: {
        nitro: {
          scheduledTasks: { [custom]: [...cleanupTasks] },
        },
      },
    })
    nuxt.hook('nitro:init', (nitro) => {
      resolvedConfig = nitro.options
      resolvedSchedules = nitro.options.scheduledTasks
    })
    await nuxt.ready()
  }, 30000)

  afterAll(async () => {
    await nuxt?.close()
  })

  it('replaces the daily default in the resolved Nitro configuration', () => {
    expect(resolvedSchedules).toEqual({ [custom]: cleanupTasks })
  })

  it.each<{
    name: string
    schedules?: Record<string, string | string[]>
    expected: Record<string, string | string[]>
  }>([
    {
      name: 'adds defaults when no schedules are configured',
      expected: { [daily]: cleanupTasks },
    },
    {
      name: 'adds defaults to an empty schedule map',
      schedules: {},
      expected: { [daily]: cleanupTasks },
    },
    {
      name: 'does not add daily defaults for custom-scheduled tasks',
      schedules: { [custom]: cleanupTasks },
      expected: { [custom]: cleanupTasks },
    },
    {
      name: 'defaults only tasks not covered by a partial override',
      schedules: { [custom]: [cleanupTasks[0]!] },
      expected: { [custom]: [cleanupTasks[0]!], [daily]: cleanupTasks.slice(1) },
    },
    {
      name: 'preserves unrelated tasks at daily and other schedules',
      schedules: { [daily]: ['app:daily'], [custom]: ['app:periodic'] },
      expected: { [daily]: ['app:daily', ...cleanupTasks], [custom]: ['app:periodic'] },
    },
    {
      name: 'preserves existing daily cleanup tasks without duplicating them',
      schedules: { [daily]: ['app:daily', cleanupTasks[0]!] },
      expected: { [daily]: ['app:daily', ...cleanupTasks] },
    },
    {
      name: 'preserves intentional multiple schedules for cleanup tasks',
      schedules: { [daily]: cleanupTasks, [custom]: cleanupTasks },
      expected: { [daily]: cleanupTasks, [custom]: cleanupTasks },
    },
    {
      name: 'recognizes a single-task string as a custom override',
      schedules: { [custom]: cleanupTasks[0]! },
      expected: { [custom]: cleanupTasks[0]!, [daily]: cleanupTasks.slice(1) },
    },
    {
      name: 'preserves an unrelated single-task string at the daily schedule',
      schedules: { [daily]: 'app:daily' },
      expected: { [daily]: ['app:daily', ...cleanupTasks] },
    },
    {
      name: 'preserves a single daily cleanup task without duplicating it',
      schedules: { [daily]: cleanupTasks[0]! },
      expected: { [daily]: cleanupTasks },
    },
  ])('$name', async ({ schedules, expected }) => {
    const config = { ...resolvedConfig, scheduledTasks: schedules && structuredClone(schedules) }
    await nuxt.callHook('nitro:config', config)
    expect(config.scheduledTasks).toEqual(expected)
    await nuxt.callHook('nitro:config', config)
    expect(config.scheduledTasks).toEqual(expected)
  })
})
