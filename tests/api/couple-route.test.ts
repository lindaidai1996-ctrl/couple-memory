import assert from 'node:assert/strict'
import test from 'node:test'

import { createCouplePatchHandler } from '../../src/app/api/couples/[coupleId]/route'

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
