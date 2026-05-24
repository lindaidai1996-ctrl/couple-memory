import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('dashboard pages replace native confirm and centered popup shells with shared Modal', () => {
  const albumsPage = readFileSync('src/app/(dashboard)/albums/page.tsx', 'utf8')
  const timelinePage = readFileSync('src/app/(dashboard)/timeline/page.tsx', 'utf8')
  const settingsPage = readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8')
  const moveDialog = readFileSync('src/components/move-to-chapter-dialog.tsx', 'utf8')

  assert.equal(albumsPage.includes("confirm(t('deleteConfirm'))"), false)
  assert.equal(albumsPage.includes("import { Modal } from '@/components/ui/modal'"), true)
  assert.equal(albumsPage.includes('<Modal'), true)

  assert.equal(timelinePage.includes("confirm(t('deleteConfirm'))"), false)
  assert.equal(timelinePage.includes("import { Modal } from '@/components/ui/modal'"), true)
  assert.equal(timelinePage.includes('<Modal'), true)

  assert.equal(settingsPage.includes("confirm(t('inviteRegenerateConfirm'))"), false)
  assert.equal(settingsPage.includes("import { Modal } from '@/components/ui/modal'"), true)
  assert.equal(settingsPage.includes('<Modal'), true)

  assert.equal(moveDialog.includes("import { Modal } from '@/components/ui/modal'"), true)
  assert.equal(moveDialog.includes('fixed inset-0 z-50 flex items-center justify-center'), false)
})
