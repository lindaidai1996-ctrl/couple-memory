import assert from 'node:assert/strict'
import test from 'node:test'

test('buildOrganizationReadiness scores albums with more chapter coverage higher than ungrouped-only albums', async () => {
  const mod = await import('../../src/lib/readiness/organization-readiness').catch(() => null)
  assert.ok(mod && typeof mod.buildOrganizationReadiness === 'function')

  const low = mod.buildOrganizationReadiness({
    totalPhotos: 10,
    chapterPhotoCount: 0,
    chapterCount: 0,
  })
  const high = mod.buildOrganizationReadiness({
    totalPhotos: 10,
    chapterPhotoCount: 8,
    chapterCount: 3,
  })

  assert.equal(high.score > low.score, true)
  assert.equal(low.suggestions.length > 0, true)
})
