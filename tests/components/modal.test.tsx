import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ModalSurface, resolveModalWidth } from '../../src/components/ui/modal'

test('resolveModalWidth maps preset sizes to stable max widths', () => {
  assert.equal(resolveModalWidth(), '32rem')
  assert.equal(resolveModalWidth('sm'), '28rem')
  assert.equal(resolveModalWidth('lg'), '40rem')
  assert.equal(resolveModalWidth('xl'), '48rem')
  assert.equal(resolveModalWidth(640), '640px')
  assert.equal(resolveModalWidth('52ch'), '52ch')
})

test('ModalSurface renders title, description, body, and default footer actions', () => {
  const markup = renderToStaticMarkup(
    <ModalSurface
      title="删除相册"
      description="该操作无法撤销"
      width="lg"
      onClose={() => {}}
      cancelText="取消"
      confirmText="删除"
      confirmVariant="danger"
    >
      <p>确认后将永久删除当前相册。</p>
    </ModalSurface>
  )

  assert.equal(markup.includes('删除相册'), true)
  assert.equal(markup.includes('该操作无法撤销'), true)
  assert.equal(markup.includes('确认后将永久删除当前相册。'), true)
  assert.equal(markup.includes('>取消<'), true)
  assert.equal(markup.includes('>删除<'), true)
  assert.equal(markup.includes('cm-button--danger'), true)
  assert.equal(markup.includes('max-width:40rem'), true)
})

test('ModalSurface removes the footer when hideFooter is enabled', () => {
  const markup = renderToStaticMarkup(
    <ModalSurface
      title="只读说明"
      onClose={() => {}}
      hideFooter
    >
      <p>当前内容仅供查看。</p>
    </ModalSurface>
  )

  assert.equal(markup.includes('当前内容仅供查看。'), true)
  assert.equal(markup.includes('cm-modal__footer'), false)
  assert.equal(markup.includes('>取消<'), false)
})

test('Modal source keeps portal mounting and escape close behavior', () => {
  const source = readFileSync('src/components/ui/modal.tsx', 'utf8')

  assert.equal(source.includes('createPortal('), true)
  assert.equal(source.includes("event.key === 'Escape'"), true)
  assert.equal(source.includes("document.body.style.overflow = 'hidden'"), true)
  assert.equal(source.includes('if (!open || !portalTarget)'), true)
})
