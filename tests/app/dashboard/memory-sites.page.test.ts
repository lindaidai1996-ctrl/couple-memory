import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildMemorySiteAlbumOptions,
  buildMemorySiteCardAction,
  buildMemorySitesEmptyMessage,
  buildMemorySitesUiText,
  parseMemorySiteAlbumsResponse,
  pickInitialMemorySiteChapterIds,
  resolveMemorySiteGenerationError,
  summarizeMemorySiteSelection,
} from '../../../src/app/(dashboard)/sites/page'
import {
  buildMemorySitePreviewModel,
  buildMemorySiteReplacePhotoOptionLabel,
  buildMemorySiteReplacePhotoOptionSummary,
  buildMemorySiteReviewActions,
  buildMemorySiteReviewBarState,
  buildMemorySiteReviewMode,
} from '../../../src/app/(dashboard-focus)/sites/[siteId]/page'

test('buildMemorySitesUiText exposes generation, selection, and publish copy', () => {
  const uiText = buildMemorySitesUiText(key => key)

  assert.equal(uiText.title, 'title')
  assert.equal(uiText.generate, 'generate')
  assert.equal(uiText.openPublicPage, 'openPublicPage')
  assert.equal(uiText.albumSelectAll, 'albumSelectAll')
  assert.equal(uiText.selected, 'selected')
  assert.equal(uiText.pickerSummary, 'pickerSummary')
})

test('buildMemorySitesUiText preserves ICU placeholders for summary and meta templates', () => {
  const uiText = buildMemorySitesUiText((key, values) => {
    if (key === 'pickerSummary') {
      return `picked ${values?.chapterCount} from ${values?.albumCount}`
    }

    if (key === 'albumMeta') {
      return `${values?.photoCount}/${values?.chapterCount}/${values?.eligiblePhotoCount}`
    }

    if (key === 'chapterMeta') {
      return `chapter ${values?.eligiblePhotoCount}`
    }

    return key
  })

  assert.equal(uiText.pickerSummary, 'picked {chapterCount} from {albumCount}')
  assert.equal(uiText.albumMeta, '{photoCount}/{chapterCount}/{eligiblePhotoCount}')
  assert.equal(uiText.chapterMeta, 'chapter {eligiblePhotoCount}')
})

test('buildMemorySiteReviewActions only exposes light-touch editing controls', () => {
  assert.deepEqual(buildMemorySiteReviewActions(), [
    'regenerateSelection',
    'replacePhoto',
    'editCopy',
    'publish',
  ])
})

test('buildMemorySiteReviewBarState keeps the top editor panel limited to lightweight actions', () => {
  assert.deepEqual(buildMemorySiteReviewBarState(), [
    'regenerateSelection',
    'replacePhoto',
    'editCopy',
  ])
})

test('buildMemorySiteReviewMode distinguishes draft publish flow from published preview flow', () => {
  assert.deepEqual(
    buildMemorySiteReviewMode({ status: 'DRAFT', publicHref: null }),
    { tone: 'draft', primaryAction: 'publish', opensPublicPage: false }
  )

  assert.deepEqual(
    buildMemorySiteReviewMode({ status: 'PUBLISHED', publicHref: '/story/demo/site' }),
    { tone: 'published', primaryAction: 'openPublicPage', opensPublicPage: true }
  )
})

test('buildMemorySiteCardAction sends published sites to the public page when available', () => {
  assert.deepEqual(
    buildMemorySiteCardAction({ id: 'site_1', status: 'READY' }, '/story/demo/site'),
    {
      href: '/sites/site_1',
      label: 'openDraft',
      external: false,
    }
  )

  assert.deepEqual(
    buildMemorySiteCardAction({ id: 'site_1', status: 'PUBLISHED' }, '/story/demo/site'),
    {
      href: '/story/demo/site',
      label: 'openPublicPage',
      external: true,
    }
  )

  assert.deepEqual(
    buildMemorySiteCardAction({ id: 'site_1', status: 'PUBLISHED' }, null),
    {
      href: '/sites/site_1',
      label: 'openDraft',
      external: false,
    }
  )
})

test('replace-photo selectors use short labels and separate summaries instead of long narrative lines', () => {
  const source = readFileSync('src/components/memory-site-detail-actions.tsx', 'utf8')
  const zhMessages = readFileSync('messages/zh-CN.json', 'utf8')

  assert.equal(buildMemorySiteReplacePhotoOptionLabel(0), '图片 1')
  assert.equal(buildMemorySiteReplacePhotoOptionLabel(2), '图片 3')
  assert.equal(
    buildMemorySiteReplacePhotoOptionSummary('黄昏的雪地里，微光映照着静谧的木屋与栅栏。她轻拉帽檐，仿佛在倾听冬日的低语。'),
    '黄昏的雪地里，微光映照着静谧的木屋与栅栏'
  )
  assert.equal(
    buildMemorySiteReplacePhotoOptionSummary('  海边晚风  '),
    '海边晚风'
  )
  assert.match(source, /buildMemorySiteReplacePhotoOptionLabel/)
  assert.match(source, /description:/)
  assert.match(zhMessages, /当前章节照片已全部被使用，无法替换。/)
})

test('buildMemorySitePreviewModel reuses the public-site editorial section mapping', () => {
  const model = buildMemorySitePreviewModel({
    title: '标题',
    subtitle: '副标题',
    intro: '引子',
    closing: '结尾',
    coverPhotoUrl: null,
    payload: {
      style: 'VELVET_PLUM_EDITORIAL',
      sections: [
        {
          chapterId: 'chapter_1',
          title: '第一章',
          summary: '摘要',
          photos: [],
        },
      ],
    },
  })

  assert.equal(model.sections[0]?.kicker, 'Chapter 01')
  assert.equal(model.sections[0]?.layout, 'imageLeft')
})

test('parseMemorySiteAlbumsResponse reads the existing albums API envelope instead of assuming a bare array', () => {
  const albums = parseMemorySiteAlbumsResponse({
    albums: [{ id: 'album_1', title: '第一年' }],
    total: 1,
  })

  assert.deepEqual(albums, [{ id: 'album_1', title: '第一年' }])
  assert.deepEqual(parseMemorySiteAlbumsResponse([{ id: 'album_2', title: '旧格式' }]), [
    { id: 'album_2', title: '旧格式' },
  ])
})

test('buildMemorySiteAlbumOptions marks album and chapter eligibility separately', () => {
  const options = buildMemorySiteAlbumOptions([
    {
      id: 'album_1',
      title: '空白相册',
      photoCount: 12,
      chapters: [],
    },
    {
      id: 'album_2',
      title: '待处理相册',
      photoCount: 8,
      chapters: [
        { id: 'chapter_2', title: '待整理', eligiblePhotoCount: 0 },
      ],
    },
    {
      id: 'album_3',
      title: '可生成相册',
      photoCount: 15,
      chapters: [
        { id: 'chapter_3', title: '旅行', eligiblePhotoCount: 4 },
        { id: 'chapter_4', title: '散步', eligiblePhotoCount: 2 },
      ],
    },
  ])

  assert.deepEqual(options.map(option => ({
    id: option.id,
    eligible: option.eligible,
    reasonKey: option.reasonKey,
  })), [
    { id: 'album_1', eligible: false, reasonKey: 'ineligibleNoChapters' },
    { id: 'album_2', eligible: false, reasonKey: 'ineligibleNoReadyPhotos' },
    { id: 'album_3', eligible: true, reasonKey: null },
  ])
  assert.equal(options[2]?.chapters[0]?.eligible, true)
  assert.equal(options[1]?.chapters[0]?.reasonKey, 'ineligibleNoReadyPhotos')
})

test('pickInitialMemorySiteChapterIds prefers every eligible chapter from the first eligible album', () => {
  assert.deepEqual(
    pickInitialMemorySiteChapterIds([
      {
        id: 'album_1',
        eligible: false,
        reasonKey: 'ineligibleNoChapters',
        title: 'A',
        photoCount: 0,
        chapterCount: 0,
        eligiblePhotoCount: 0,
        chapters: [],
      },
      {
        id: 'album_2',
        eligible: true,
        reasonKey: null,
        title: 'B',
        photoCount: 1,
        chapterCount: 2,
        eligiblePhotoCount: 3,
        chapters: [
          { id: 'chapter_1', title: '春天', eligible: true, reasonKey: null, eligiblePhotoCount: 2 },
          { id: 'chapter_2', title: '夏天', eligible: true, reasonKey: null, eligiblePhotoCount: 1 },
        ],
      },
    ]),
    ['chapter_1', 'chapter_2']
  )

  assert.deepEqual(
    pickInitialMemorySiteChapterIds([
      {
        id: 'album_1',
        eligible: false,
        reasonKey: 'ineligibleNoChapters',
        title: 'A',
        photoCount: 0,
        chapterCount: 0,
        eligiblePhotoCount: 0,
        chapters: [],
      },
    ]),
    []
  )
})

test('summarizeMemorySiteSelection counts selected chapters and source albums', () => {
  const summary = summarizeMemorySiteSelection(
    [
      {
        id: 'album_1',
        title: 'A',
        photoCount: 1,
        chapterCount: 2,
        eligiblePhotoCount: 3,
        eligible: true,
        reasonKey: null,
        chapters: [
          { id: 'chapter_1', title: '春天', eligible: true, reasonKey: null, eligiblePhotoCount: 1 },
          { id: 'chapter_2', title: '夏天', eligible: true, reasonKey: null, eligiblePhotoCount: 2 },
        ],
      },
      {
        id: 'album_2',
        title: 'B',
        photoCount: 1,
        chapterCount: 1,
        eligiblePhotoCount: 1,
        eligible: true,
        reasonKey: null,
        chapters: [
          { id: 'chapter_3', title: '秋天', eligible: true, reasonKey: null, eligiblePhotoCount: 1 },
        ],
      },
    ],
    ['chapter_1', 'chapter_3'],
    '{chapterCount} / {albumCount}'
  )

  assert.equal(summary, '2 / 2')
})

test('resolveMemorySiteGenerationError keeps explicit API copy and falls back to generic message', () => {
  assert.equal(
    resolveMemorySiteGenerationError({ error: 'Not enough content to build memory site' }, '生成失败'),
    'Not enough content to build memory site'
  )

  assert.equal(
    resolveMemorySiteGenerationError({}, '生成失败'),
    '生成失败'
  )
})

test('buildMemorySitesEmptyMessage distinguishes no-album from not-ready-yet states', () => {
  const uiText = buildMemorySitesUiText(key => key)

  assert.equal(
    buildMemorySitesEmptyMessage({ hasAlbums: false, hasEligibleAlbums: false }, uiText),
    'emptyNoAlbums'
  )

  assert.equal(
    buildMemorySitesEmptyMessage({ hasAlbums: true, hasEligibleAlbums: false }, uiText),
    'emptyNoEligibleAlbums'
  )

  assert.equal(
    buildMemorySitesEmptyMessage({ hasAlbums: true, hasEligibleAlbums: true }, uiText),
    'empty'
  )
})

test('memory sites page uses theme-aware selection surfaces instead of hard-coded white fills', () => {
  const source = readFileSync('src/app/(dashboard)/sites/page.tsx', 'utf8')
  const globals = readFileSync('src/app/globals.css', 'utf8')

  assert.match(source, /memory-site-selection-panel/)
  assert.match(source, /memory-site-selection-option--selected/)
  assert.match(source, /buttonClassName\(\{/)
  assert.doesNotMatch(source, /bg-white\/78/)
  assert.doesNotMatch(source, /bg-white\/52/)
  assert.doesNotMatch(source, /bg-white\/38/)
  assert.match(globals, /\.memory-site-selection-panel/)
  assert.match(globals, /\.memory-site-checkbox--checked/)
})

test('memory site detail review bar uses dark-theme-aware surfaces and shared buttons', () => {
  const source = readFileSync('src/components/memory-site-detail-actions.tsx', 'utf8')
  const globals = readFileSync('src/app/globals.css', 'utf8')

  assert.match(source, /memory-site-review-bar/)
  assert.match(source, /dark:bg-white\/\[0\.04\]/)
  assert.match(source, /dark:bg-white\/\[0\.05\]/)
  assert.match(source, /bg-white\/78/)
  assert.match(globals, /\.memory-site-review-bar \{/)
  assert.match(globals, /html\.dark \.memory-site-review-bar \{/)
})
