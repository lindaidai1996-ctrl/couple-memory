import assert from 'node:assert/strict'
import test from 'node:test'

function createRequest(url: string) {
  return new Request(`http://localhost${url}`)
}

function createAuthContext(coupleId = 'couple_1') {
  return {
    userId: 'user_1',
    coupleUser: {
      coupleId,
    },
  } as never
}

test('createOrganizationReadinessHandler returns readiness score and suggestions', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/publish-readiness/route').catch(() => null)
  assert.ok(mod && typeof mod.createOrganizationReadinessHandler === 'function')

  const handler = mod.createOrganizationReadinessHandler({
    prismaClient: {
      photo: {
        count: async (args: Record<string, unknown>) => {
          const where = args.where as { chapterId?: { not: null } }
          return where?.chapterId ? 7 : 10
        },
      },
      albumChapter: {
        count: async () => 3,
      },
    } as never,
  })

  const response = await handler(
    createRequest('/api/couples/couple_1/publish-readiness'),
    createAuthContext()
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(typeof payload.score, 'number')
  assert.equal(Array.isArray(payload.suggestions), true)
})
