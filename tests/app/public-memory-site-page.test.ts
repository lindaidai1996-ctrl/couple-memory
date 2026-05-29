import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildMemorySitePageModel,
  buildMemorySiteShellClassName,
} from '../../src/app/story/[slug]/site/page'
import {
  buildMemorySiteRevealClassName,
  buildMemorySiteRevealStyle,
} from '../../src/components/memory-site/memory-site-reveal'

test('buildMemorySitePageModel keeps only the first seven sections and alternates editorial layouts', () => {
  const model = buildMemorySitePageModel({
    title: '在一起的第一年',
    subtitle: '副标题',
    intro: '引子',
    closing: '收尾',
    coverPhotoUrl: 'https://img.example.com/cover.jpg',
    payload: {
      style: 'VELVET_PLUM_EDITORIAL',
      sections: Array.from({ length: 8 }, (_, index) => ({
        chapterId: `chapter_${index}`,
        title: `阶段 ${index + 1}`,
        summary: 'summary',
        photos: [
          {
            id: `photo_${index}`,
            imageUrl: 'https://img.example.com/a.jpg',
            role: 'hero',
            narrative: 'narrative',
            locationName: null,
            takenAt: null,
          },
        ],
      })),
    },
  })

  assert.equal(model.sections.length, 7)
  assert.equal(model.sections[0]?.layout, 'imageLeft')
  assert.equal(model.sections[1]?.layout, 'imageRight')
})

test('buildMemorySiteShellClassName references Velvet Plum surfaces instead of the old warm shell', () => {
  assert.match(buildMemorySiteShellClassName(), /vp-memory-site-shell/)
})

test('memory site reveal uses one-time rise-and-fade motion with reduced-motion-safe defaults', () => {
  const className = buildMemorySiteRevealClassName({ stagger: 'children' })
  const style = buildMemorySiteRevealStyle({ delayMs: 120 })
  const pageSource = readFileSync('src/app/s/[slug]/site/page.tsx', 'utf8')
  const sectionSource = readFileSync('src/components/memory-site/site-section.tsx', 'utf8')

  assert.match(className, /\bmemory-site-reveal\b/)
  assert.match(className, /\bmemory-site-reveal-children\b/)
  assert.equal((style as Record<string, string>)['--memory-site-reveal-delay'], '120ms')
  assert.match(pageSource, /MemorySiteReveal/)
  assert.match(sectionSource, /data-memory-site-reveal-child/)
})
