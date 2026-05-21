import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCoupleUpdateData,
  createCouplePatchHandler,
} from '../../src/app/api/couples/[coupleId]/route'

function createJsonRequest(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

test('createCouplePatchHandler returns a unified conflict error when slug is already taken', async () => {
  const handler = createCouplePatchHandler({
    prisma: {
      couple: {
        findUnique: async (args: Record<string, unknown>) => ({
          id: 'other-couple',
          slug: (args as { where: { slug: string } }).where.slug,
        }),
        update: async () => {
          throw new Error('update should not be called when slug conflicts')
        },
      },
    },
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1', { slug: 'shared-space' }),
    { coupleUser: { coupleId: 'couple_1' } }
  )

  assert.equal(response.status, 409)
  const payload = await response.json()
  assert.equal(payload.error.code, 'SLUG_ALREADY_TAKEN')
  assert.equal(payload.error.message, 'Slug already taken')
  assert.equal(payload.error.retryable, false)
  assert.equal(typeof payload.error.requestId, 'string')
  assert.ok(payload.error.requestId.length > 0)
})

test('buildCoupleUpdateData keeps only valid AI preference updates', () => {
  assert.deepEqual(
    buildCoupleUpdateData({
      captionStylePreference: 'poetic',
      tonePreference: 'witty',
      blockedPhrases: [' soulmate ', 'meant to be', ''],
    }),
    {
      captionStylePreference: 'poetic',
      tonePreference: 'witty',
      blockedPhrases: ['soulmate', 'meant to be'],
    }
  )
})

test('buildCoupleUpdateData omits invalid AI preference updates instead of clearing stored values', () => {
  assert.deepEqual(
    buildCoupleUpdateData({
      captionStylePreference: 'playful',
      tonePreference: 'dramatic',
      blockedPhrases: ['keep', 42] as unknown as string[],
    }),
    {}
  )
})

test('createCouplePatchHandler persists AI preference updates for the current couple', async () => {
  let updateArgs: unknown

  const handler = createCouplePatchHandler({
    prisma: {
      couple: {
        findUnique: async () => null,
        update: async (args: unknown) => {
          updateArgs = args
          return {
            id: 'couple_1',
            captionStylePreference: 'diary',
            tonePreference: null,
            blockedPhrases: ['avoid this'],
          }
        },
      },
    },
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1', {
      captionStylePreference: 'diary',
      tonePreference: '   ',
      blockedPhrases: [' avoid this ', ''],
    }),
    { coupleUser: { coupleId: 'couple_1' } }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(updateArgs, {
    where: { id: 'couple_1' },
    data: {
      captionStylePreference: 'diary',
      tonePreference: null,
      blockedPhrases: ['avoid this'],
    },
  })
  assert.deepEqual(await response.json(), {
    id: 'couple_1',
    captionStylePreference: 'diary',
    tonePreference: null,
    blockedPhrases: ['avoid this'],
  })
})
