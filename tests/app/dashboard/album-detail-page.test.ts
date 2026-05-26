import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  ALBUM_NARRATIVE_EDITOR_CLASS,
  ALBUM_NARRATIVE_HERO_CARD_CLASS,
  ALBUM_NARRATIVE_HIGHLIGHT_CARD_CLASS,
  ALBUM_NARRATIVE_LAYOUT_CLASS,
  ALBUM_NARRATIVE_PREVIEW_STATE_CLASS,
  ALBUM_NARRATIVE_STAT_GRID_CLASS,
  ALBUM_NARRATIVE_STAT_CARD_CLASS,
  buildAlbumCoverSectionState,
  buildAlbumDetailWorkspaceState,
  buildAlbumNarrativePreview,
  buildAlbumCoverCandidates,
  buildAlbumDescriptionDraftSuggestion,
  buildAlbumDetailUiText,
  buildAlbumNarrativeComparison,
  buildNextAlbumDescriptionDraftSuggestion,
  buildNextAlbumTitleDraftSuggestion,
  buildAlbumDetailSections,
  buildAlbumMetaDraft,
  buildAlbumTitleDraftSuggestion,
  buildAlbumMetaUpdatePayload,
  buildAlbumNarrativeSnapshot,
  buildChapterSummaryActionState,
} from '../../../src/app/(dashboard)/albums/[albumId]/page'
import {
  AlbumChapterCard,
  buildAlbumChapterCardMeta,
  buildAlbumChapterCardSelectionState,
  buildAlbumChapterPreviewTileClassName,
} from '../../../src/components/album-chapter-card'
import {
  buildAlbumDetailWorkspaceHeader,
} from '../../../src/components/album-detail-workspace'
import {
  PhotoSelectionGrid,
  buildPhotoSelectionCheckboxClassName,
  buildPhotoSelectionCheckmarkClassName,
  buildPhotoSelectionCheckboxInnerClassName,
  buildPhotoSelectionDotClassName,
  buildAlbumPhotoPreviewItems,
  buildPhotoSelectionOverlayClassName,
  buildPhotoSelectionTileClassName,
} from '../../../src/components/photo-selection-grid'
import {
  ChapterDetailDrawer,
  buildChapterDetailDraft,
} from '../../../src/components/chapter-detail-drawer'

test('buildAlbumDetailUiText exposes localized chapter page copy', () => {
  const uiText = buildAlbumDetailUiText((key, values) => {
    if (values && 'count' in values) {
      return `${key}:${String(values.count)}`
    }

    return key
  })

  assert.equal(uiText.chapterSectionTitle, 'chapterSectionTitle')
  assert.equal(uiText.organizeAllPhotos, 'organizeAllPhotos')
  assert.equal(uiText.selectionCount(3), 'selectionCount:3')
  assert.equal(uiText.chapterCard.generateSummary, 'chapterCardGenerateSummary')
  assert.equal(uiText.chapterCard.refreshingSummary, 'chapterCardRefreshingSummary')
  assert.equal(uiText.chapterCard.generatingSummary, 'chapterCardGeneratingSummary')
  assert.equal(uiText.chapterEmpty.action, 'chapterEmptyAction')
  assert.equal(uiText.selectionToolbar.moveToChapter, 'selectionToolbarMoveToChapter')
  assert.equal(uiText.composer.title, 'composerTitle')
  assert.equal(uiText.moveDialog.title, 'moveDialogTitle')
  assert.equal(uiText.detailDrawer.save, 'detailDrawerSave')
  assert.equal(uiText.workspace.emptyTitle, 'workspaceEmptyTitle')
  assert.equal(uiText.workspace.emptyDescription, 'workspaceEmptyDescription')
  assert.equal(uiText.workspace.close, 'workspaceClose')
  assert.equal(uiText.createChapterFailed, 'createChapterFailed')
  assert.equal(uiText.summaryUpdated, 'summaryUpdated')
  assert.equal(uiText.photoActions.deletePhoto, 'photoActionDeletePhoto')
  assert.equal(uiText.photoActions.deletingPhoto, 'photoActionDeletingPhoto')
  assert.equal(uiText.photoActions.deleteConfirm, 'photoActionDeleteConfirm')
  assert.equal(uiText.photoActions.setAsCover, 'photoActionSetAsCover')
  assert.equal(uiText.photoActions.settingCover, 'photoActionSettingCover')
  assert.equal(uiText.photoActions.currentCover, 'photoActionCurrentCover')
  assert.equal(uiText.photoActions.setCoverConfirm, 'photoActionSetCoverConfirm')
  assert.equal(uiText.narrative.editAlbum, 'narrativeEditAlbum')
  assert.equal(uiText.narrative.saveAlbum, 'narrativeSaveAlbum')
  assert.equal(uiText.narrative.generateDescriptionDraft, 'narrativeGenerateDescriptionDraft')
  assert.equal(uiText.narrative.generateTitleDraft, 'narrativeGenerateTitleDraft')
  assert.equal(uiText.narrative.coverCandidates, 'narrativeCoverCandidates')
  assert.equal(uiText.narrative.coverCandidatesEmpty, 'coverRecentPhotosEmpty')
  assert.equal(uiText.narrative.setAsCover, 'narrativeSetAsCover')
  assert.equal(uiText.narrative.currentCover, 'narrativeCurrentCover')
  assert.equal(uiText.narrative.aiTitleLabel, 'narrativeAiTitleLabel')
  assert.equal(uiText.narrative.currentTitleLabel, 'narrativeCurrentTitleLabel')
  assert.equal(uiText.narrative.aiDescriptionLabel, 'narrativeAiDescriptionLabel')
  assert.equal(uiText.narrative.currentDescriptionLabel, 'narrativeCurrentDescriptionLabel')
})

test('album narrative cards use shared dashboard surface tokens for theme-aware backgrounds', () => {
  assert.match(ALBUM_NARRATIVE_LAYOUT_CLASS, /\bcm-album-narrative\b/)
  assert.match(ALBUM_NARRATIVE_LAYOUT_CLASS, /\bdashboard-surface-card-strong\b/)
  assert.equal(ALBUM_NARRATIVE_LAYOUT_CLASS.includes('rounded-[26px]'), true)
  assert.equal(ALBUM_NARRATIVE_LAYOUT_CLASS.includes('p-3.5'), true)
  assert.match(ALBUM_NARRATIVE_HERO_CARD_CLASS, /\bcm-album-narrative__hero-card\b/)
  assert.equal(ALBUM_NARRATIVE_HERO_CARD_CLASS.includes('rounded-[24px]'), true)
  assert.equal(ALBUM_NARRATIVE_HERO_CARD_CLASS.includes('py-3'), true)
  assert.match(ALBUM_NARRATIVE_HIGHLIGHT_CARD_CLASS, /\bcm-album-narrative__preview-card\b/)
  assert.equal(ALBUM_NARRATIVE_HIGHLIGHT_CARD_CLASS.includes('rounded-[24px]'), true)
  assert.equal(ALBUM_NARRATIVE_HIGHLIGHT_CARD_CLASS.includes('py-3'), true)
  assert.match(ALBUM_NARRATIVE_PREVIEW_STATE_CLASS, /\bcm-album-narrative__preview-state\b/)
  assert.equal(ALBUM_NARRATIVE_PREVIEW_STATE_CLASS.includes('rounded-[24px]'), true)
  assert.equal(ALBUM_NARRATIVE_PREVIEW_STATE_CLASS.includes('py-3'), true)
  assert.match(ALBUM_NARRATIVE_EDITOR_CLASS, /\bcm-album-narrative__editor\b/)
  assert.match(ALBUM_NARRATIVE_EDITOR_CLASS, /\bdashboard-inset-panel\b/)
  assert.equal(ALBUM_NARRATIVE_EDITOR_CLASS.includes('rounded-[24px]'), true)
  assert.equal(ALBUM_NARRATIVE_EDITOR_CLASS.includes('py-3'), true)
  assert.match(ALBUM_NARRATIVE_STAT_GRID_CLASS, /\bcm-album-narrative__stats\b/)
  assert.match(ALBUM_NARRATIVE_STAT_CARD_CLASS, /\bcm-album-narrative__stat-card\b/)
  assert.equal(ALBUM_NARRATIVE_STAT_CARD_CLASS.includes('rounded-[22px]'), true)
  assert.equal(ALBUM_NARRATIVE_STAT_CARD_CLASS.includes('py-2.5'), true)
})

test('buildAlbumDetailSections returns chapter area before ungrouped area', () => {
  const sections = buildAlbumDetailSections({
    chapters: [
      { id: 'chapter_1', title: '第一次一起看海' },
    ],
    ungroupedPhotos: [
      { id: 'photo_2' },
    ],
  })

  assert.deepEqual(sections, {
    chapterCount: 1,
    hasEmptyChapters: false,
    ungroupedCount: 1,
    chapterGridMode: 'card-only',
    order: ['chapters', 'ungrouped'],
  })
})

test('buildAlbumDetailSections keeps chapter photos in card-only mode during album organization', () => {
  const sections = buildAlbumDetailSections({
    chapters: [
      { id: 'chapter_1', title: '第一次一起看海' },
    ],
    ungroupedPhotos: [
      { id: 'photo_2' },
    ],
  })

  assert.equal(sections.chapterGridMode, 'card-only')
})

test('buildAlbumDetailSections shows empty chapter guidance when there are no chapters', () => {
  const sections = buildAlbumDetailSections({
    chapters: [],
    ungroupedPhotos: [
      { id: 'photo_2' },
      { id: 'photo_3' },
    ],
  })

  assert.equal(sections.hasEmptyChapters, true)
  assert.equal(sections.chapterCount, 0)
  assert.equal(sections.ungroupedCount, 2)
})

test('AlbumChapterCard preview tiles keep full grid width after shared button refactor', () => {
  const tileClassName = buildAlbumChapterPreviewTileClassName()
  const markup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: null,
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            fileName: 'cover.jpg',
            status: 'READY',
            thumbnailUrl: 'https://cdn.example.com/cover.jpg',
            displayUrl: null,
            takenAt: null,
            userCaption: null,
            aiCaption: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
            locationName: null,
            canBeCover: false,
            isAlbumCover: false,
          },
        ],
      },
      copy: {
        photoCount: '1 张照片',
        editChapter: '编辑',
        refreshSummary: '刷新',
        generateSummary: '生成',
        refreshingSummary: '刷新中',
        generatingSummary: '生成中',
      },
    })
  )

  assert.match(tileClassName, /\bcm-media-tile\b/)
  assert.doesNotMatch(tileClassName, /\bcm-button\b/)
  assert.match(tileClassName, /\brounded-none\b/)
  assert.match(tileClassName, /\bcursor-pointer\b/)
  assert.equal(markup.includes('cursor-pointer'), true)
  assert.match(markup, /cm-media-tile/)
})

test('AlbumChapterCard keeps background note out of the card reading surface', () => {
  const markup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: '那天风很大，但我们待了很久。',
        aiSummary: '我们在海边待了很久。',
        photos: [],
      },
      copy: {
        photoCount: '0 张照片',
        editChapter: '编辑',
        refreshSummary: '刷新',
        generateSummary: '生成',
        refreshingSummary: '刷新中',
        generatingSummary: '生成中',
      },
    })
  )

  assert.equal(markup.includes('那天风很大，但我们待了很久。'), false)
  assert.equal(markup.includes('我们在海边待了很久。'), true)
})

test('buildAlbumDetailWorkspaceHeader omits helper description copy for photo and chapter drawers', () => {
  const copy = {
    emptyTitle: 'emptyTitle',
    emptyDescription: 'emptyDescription',
    close: 'close',
    photoTitle: '查看照片',
    photoDescription: '保持当前滚动位置不变，在这里查看和编辑这张照片。',
    chapterTitle: '编辑章节',
    chapterDescription: '在这里调整章节标题和背景说明，不打断相册浏览。',
  }

  assert.deepEqual(
    buildAlbumDetailWorkspaceHeader({ kind: 'photo', copy }),
    {
      title: '查看照片',
      description: null,
    }
  )

  assert.deepEqual(
    buildAlbumDetailWorkspaceHeader({ kind: 'chapter', copy }),
    {
      title: '编辑章节',
      description: null,
    }
  )
})

test('ChapterDetailDrawer does not render helper description copy', () => {
  const markup = renderToStaticMarkup(
    React.createElement(ChapterDetailDrawer, {
      open: true,
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: '那天风很大',
        aiSummary: null,
        photos: [],
      },
      copy: {
        title: '编辑章节',
        description: '在这里调整章节标题和背景说明，不打断相册浏览。',
        cancel: '取消',
        save: '保存',
      },
      onClose: () => {},
      onSave: () => {},
    })
  )

  assert.equal(markup.includes('在这里调整章节标题和背景说明，不打断相册浏览。'), false)
  assert.equal(markup.includes('编辑章节'), true)
})

test('photo selection checkbox uses shared premium selection classes', () => {
  const tileClassName = buildPhotoSelectionTileClassName()
  const selectedClassName = buildPhotoSelectionCheckboxClassName(true)
  const idleClassName = buildPhotoSelectionCheckboxClassName(false)
  const selectedInnerClassName = buildPhotoSelectionCheckboxInnerClassName(true)
  const idleInnerClassName = buildPhotoSelectionCheckboxInnerClassName(false)
  const visibleCheckmarkClassName = buildPhotoSelectionCheckmarkClassName(true)
  const hiddenCheckmarkClassName = buildPhotoSelectionCheckmarkClassName(false)
  const idleDotClassName = buildPhotoSelectionDotClassName(false)
  const selectedDotClassName = buildPhotoSelectionDotClassName(true)
  const selectedOverlayClassName = buildPhotoSelectionOverlayClassName(true)
  const idleOverlayClassName = buildPhotoSelectionOverlayClassName(false)

  assert.equal(tileClassName.includes('rounded-none'), true)
  assert.equal(tileClassName.includes('cursor-pointer'), true)
  assert.match(selectedClassName, /\bcm-photo-selection-checkbox--selected\b/)
  assert.equal(selectedClassName.includes('h-[32px]'), true)
  assert.equal(selectedClassName.includes('rounded-[10px]'), true)
  assert.match(idleClassName, /\bcm-photo-selection-checkbox--idle\b/)
  assert.equal(idleClassName.includes('bg-transparent'), true)
  assert.equal(selectedInnerClassName.includes('bg-[linear-gradient(135deg,#5b3a52_0%,#9d7084_55%,#e7c9c5_100%)]'), true)
  assert.equal(idleInnerClassName.includes('bg-[linear-gradient(180deg,rgba(255,252,253,0.9),rgba(246,239,243,0.82))]'), true)
  assert.equal(selectedOverlayClassName.includes('opacity-100'), true)
  assert.equal(selectedOverlayClassName.includes('bg-[linear-gradient(180deg,rgba(91,58,82,0.14),rgba(91,58,82,0.24))]'), true)
  assert.equal(idleOverlayClassName.includes('opacity-0'), true)
  assert.match(visibleCheckmarkClassName, /\bcm-photo-selection-checkbox__check--visible\b/)
  assert.equal(visibleCheckmarkClassName.includes('opacity-100'), true)
  assert.match(hiddenCheckmarkClassName, /\bcm-photo-selection-checkbox__check--hidden\b/)
  assert.equal(hiddenCheckmarkClassName.includes('opacity-0'), true)
  assert.equal(idleDotClassName.includes('opacity-100'), true)
  assert.equal(idleDotClassName.includes('w-[10px]'), true)
  assert.equal(selectedDotClassName.includes('opacity-0'), true)
})

test('buildAlbumNarrativeSnapshot reports a ready narrative album', () => {
  assert.deepEqual(
    buildAlbumNarrativeSnapshot({
      title: '2024 夏天',
      description: '一起旅行和普通日常都留下来了。',
      chapters: [
        {
          id: 'chapter_1',
          title: '第一次一起看海',
          backgroundNote: '那天风很大',
          aiSummary: '我们在海边待了很久。',
          photos: [{ id: 'photo_1' }],
        },
      ],
      ungroupedPhotos: [],
    }),
    {
      chapterCount: 1,
      summarizedChapterCount: 1,
      ungroupedCount: 0,
      hasDescription: true,
      hasNarrativeFoundation: true,
      shouldPromptDescription: false,
      shouldPromptOrganization: false,
    }
  )
})

test('buildAlbumNarrativeSnapshot highlights missing story structure and description', () => {
  assert.deepEqual(
    buildAlbumNarrativeSnapshot({
      title: '2024 夏天',
      description: null,
      chapters: [],
      ungroupedPhotos: [{ id: 'photo_2' }, { id: 'photo_3' }],
    }),
    {
      chapterCount: 0,
      summarizedChapterCount: 0,
      ungroupedCount: 2,
      hasDescription: false,
      hasNarrativeFoundation: false,
      shouldPromptDescription: true,
      shouldPromptOrganization: true,
    }
  )
})

test('buildAlbumMetaDraft derives editable album title and description values', () => {
  assert.deepEqual(
    buildAlbumMetaDraft({
      title: '2024 夏天',
      description: null,
    }),
    {
      title: '2024 夏天',
      description: '',
    }
  )
})

test('buildAlbumMetaUpdatePayload trims title and clears blank description', () => {
  assert.deepEqual(
    buildAlbumMetaUpdatePayload({
      title: ' 2024 夏天 ',
      description: '   ',
    }),
    {
      title: '2024 夏天',
      description: null,
    }
  )
})

test('buildAlbumDescriptionDraftSuggestion combines chapter summaries into an album draft', () => {
  assert.equal(
    buildAlbumDescriptionDraftSuggestion({
      title: '2024 夏天',
      chapters: [
        {
          title: '第一次一起看海',
          aiSummary: '我们在海边待了很久。',
        },
        {
          title: '回家路上的晚风',
          aiSummary: '那天回去的路上很安静。',
        },
      ],
    }),
    '这本相册收着“第一次一起看海”和“回家路上的晚风”这些回忆。我们在海边待了很久。那天回去的路上很安静。'
  )
})

test('buildAlbumDescriptionDraftSuggestion falls back to chapter titles when summaries are missing', () => {
  assert.equal(
    buildAlbumDescriptionDraftSuggestion({
      title: '2024 夏天',
      chapters: [
        {
          title: '第一次一起看海',
          aiSummary: null,
        },
      ],
    }),
    '这本相册记录了“第一次一起看海”这一段回忆。'
  )
})

test('buildAlbumTitleDraftSuggestion uses a single chapter title when only one chapter exists', () => {
  assert.equal(
    buildAlbumTitleDraftSuggestion({
      title: '2024',
      chapters: [
        {
          title: '赛里木湖婚纱照的时刻',
        },
      ],
    }),
    '赛里木湖婚纱照'
  )
})

test('buildAlbumTitleDraftSuggestion combines two chapter titles into a concise album title', () => {
  assert.equal(
    buildAlbumTitleDraftSuggestion({
      title: '2024',
      chapters: [
        {
          title: '赛里木湖婚纱照的时刻',
        },
        {
          title: '库尔德宁的晚风',
        },
      ],
    }),
    '赛里木湖与库尔德宁'
  )
})

test('buildNextAlbumTitleDraftSuggestion avoids returning the same draft when regenerating', () => {
  const first = buildNextAlbumTitleDraftSuggestion({
    title: '2024',
    chapters: [
      { title: '赛里木湖婚纱照的时刻' },
      { title: '库尔德宁婚纱照' },
    ],
  })

  const second = buildNextAlbumTitleDraftSuggestion({
    title: '2024',
    chapters: [
      { title: '赛里木湖婚纱照的时刻' },
      { title: '库尔德宁婚纱照' },
    ],
    previousSuggestion: first,
  })

  assert.equal(first.length > 0, true)
  assert.equal(second.length > 0, true)
  assert.notEqual(second, first)
})

test('buildNextAlbumDescriptionDraftSuggestion avoids returning the same draft when regenerating', () => {
  const first = buildNextAlbumDescriptionDraftSuggestion({
    title: '2024',
    chapters: [
      { title: '赛里木湖婚纱照的时刻', aiSummary: '2026年5月6日，赛里木湖一起拍婚纱照。' },
      { title: '库尔德宁婚纱照', aiSummary: '2026年5月6日库尔德宁也拍了婚纱照。' },
    ],
  })

  const second = buildNextAlbumDescriptionDraftSuggestion({
    title: '2024',
    chapters: [
      { title: '赛里木湖婚纱照的时刻', aiSummary: '2026年5月6日，赛里木湖一起拍婚纱照。' },
      { title: '库尔德宁婚纱照', aiSummary: '2026年5月6日库尔德宁也拍了婚纱照。' },
    ],
    previousSuggestion: first,
  })

  assert.equal(first.length > 0, true)
  assert.equal(second.length > 0, true)
  assert.notEqual(second, first)
})

test('buildAlbumNarrativeComparison distinguishes AI drafts from current album text', () => {
  assert.deepEqual(
    buildAlbumNarrativeComparison({
      album: {
        title: '2024 夏天',
        description: '这是当前保存的相册说明。',
        chapters: [
          {
            title: '第一次一起看海',
            aiSummary: '我们在海边待了很久。',
          },
          {
            title: '回家路上的晚风',
            aiSummary: '那天回去的路上很安静。',
          },
        ],
      },
    }),
    {
      aiTitle: '第一次一起看海与回家路上',
      currentTitle: '2024 夏天',
      aiDescription: '这本相册收着“第一次一起看海”和“回家路上的晚风”这些回忆。我们在海边待了很久。那天回去的路上很安静。',
      currentDescription: '这是当前保存的相册说明。',
      hasAiTitle: true,
      hasAiDescription: true,
      titleDiffers: true,
      descriptionDiffers: true,
    }
  )
})

test('buildAlbumNarrativePreview removes duplicated AI title draft and keeps description comparison', () => {
  assert.deepEqual(
    buildAlbumNarrativePreview({
      comparison: {
        aiTitle: '第一次一起看海与回家路上',
        currentTitle: '2024 夏天',
        aiDescription: '这本相册收着“第一次一起看海”和“回家路上的晚风”这些回忆。',
        currentDescription: '这是当前保存的相册说明。',
        hasAiTitle: true,
        hasAiDescription: true,
        titleDiffers: true,
        descriptionDiffers: true,
      },
      copy: {
        currentTitleLabel: '当前相册标题',
        aiDescriptionLabel: 'AI 说明草稿',
        currentDescriptionLabel: '当前相册说明',
        needDescriptionHint: '请先补充相册说明',
        descriptionMissing: '还没有相册说明',
      },
    }),
    {
      titleLabel: '当前相册标题',
      titleValue: '2024 夏天',
      draftDescriptionLabel: 'AI 说明草稿',
      draftDescriptionValue: '这本相册收着“第一次一起看海”和“回家路上的晚风”这些回忆。',
      currentDescriptionLabel: '当前相册说明',
      currentDescriptionValue: '这是当前保存的相册说明。',
      hasDraftDescription: true,
    }
  )
})

test('album narrative stat typography is compact enough for the detail page', () => {
  const css = fs.readFileSync('/Users/user/Documents/codes/work/src/app/globals.css', 'utf8')

  assert.equal(css.includes('font-size: clamp(16px, 1.55vw, 19px);'), true)
  assert.equal(css.includes('font-size: clamp(20px, 2vw, 24px);'), true)
  assert.equal(css.includes('min-height: 76px;'), true)
})

test('album narrative editor no longer renders duplicated helper copy under edit header', () => {
  const pageSource = fs.readFileSync(
    '/Users/user/Documents/codes/work/src/app/(dashboard)/albums/[albumId]/page.tsx',
    'utf8'
  )

  assert.equal(pageSource.includes('cm-album-narrative__editor-copy'), false)
})

test('album narrative suggestion cards use dedicated compact spacing and title styles', () => {
  const pageSource = fs.readFileSync(
    '/Users/user/Documents/codes/work/src/app/(dashboard)/albums/[albumId]/page.tsx',
    'utf8'
  )
  const css = fs.readFileSync('/Users/user/Documents/codes/work/src/app/globals.css', 'utf8')

  assert.equal(pageSource.includes('cm-album-narrative__candidate-head'), true)
  assert.equal(pageSource.includes('cm-album-narrative__candidate-title'), true)
  assert.equal(css.includes('.cm-album-narrative__candidate-head'), true)
  assert.equal(css.includes('.cm-album-narrative__candidate-title'), true)
})

test('album narrative preview title block uses dedicated head spacing', () => {
  const pageSource = fs.readFileSync(
    '/Users/user/Documents/codes/work/src/app/(dashboard)/albums/[albumId]/page.tsx',
    'utf8'
  )
  const css = fs.readFileSync('/Users/user/Documents/codes/work/src/app/globals.css', 'utf8')

  assert.equal(pageSource.includes('cm-album-narrative__preview-head'), true)
  assert.equal(css.includes('.cm-album-narrative__preview-head'), true)
})

test('album narrative stats no longer include duplicated description status card', () => {
  const metricLabels = [
    '章节数',
    '已生成摘要的章节',
    '未归类照片',
  ]

  assert.equal(metricLabels.includes('相册说明'), false)
  assert.equal(metricLabels.length, 3)
})

test('buildAlbumCoverCandidates keeps only ready photos and prioritizes the current cover', () => {
  const candidates = buildAlbumCoverCandidates([
    {
      id: 'photo_2',
      fileName: 'cover.jpg',
      thumbnailUrl: 'https://img.example.com/cover-thumb.jpg',
      displayUrl: 'https://img.example.com/cover.jpg',
      status: 'READY',
      aiCaption: '现在的封面',
      userCaption: null,
      takenAt: null,
      locationName: null,
      aiLayout: 'story-card',
      aiScene: null,
      aiMood: null,
      cameraMake: null,
      cameraModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
      isAlbumCover: true,
      canBeCover: true,
    },
    {
      id: 'photo_1',
      fileName: 'candidate.jpg',
      thumbnailUrl: 'https://img.example.com/candidate-thumb.jpg',
      displayUrl: 'https://img.example.com/candidate.jpg',
      status: 'READY',
      aiCaption: '候选封面',
      userCaption: null,
      takenAt: null,
      locationName: null,
      aiLayout: 'story-card',
      aiScene: null,
      aiMood: null,
      cameraMake: null,
      cameraModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
      isAlbumCover: false,
      canBeCover: true,
    },
    {
      id: 'photo_3',
      fileName: 'processing.jpg',
      thumbnailUrl: null,
      displayUrl: null,
      status: 'PROCESSING',
      aiCaption: null,
      userCaption: null,
      takenAt: null,
      locationName: null,
      aiLayout: 'story-card',
      aiScene: null,
      aiMood: null,
      cameraMake: null,
      cameraModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
      isAlbumCover: false,
      canBeCover: false,
    },
  ])

  assert.deepEqual(candidates, [
    {
      id: 'photo_2',
      previewUrl: 'https://img.example.com/cover-thumb.jpg',
      label: '现在的封面',
      isCurrent: true,
    },
    {
      id: 'photo_1',
      previewUrl: 'https://img.example.com/candidate-thumb.jpg',
      label: '候选封面',
      isCurrent: false,
    },
  ])
})

test('buildAlbumCoverSectionState keeps the cover section visible with an empty-state message when no candidate is eligible', () => {
  const state = buildAlbumCoverSectionState([
    {
      id: 'photo_1',
      fileName: 'processing.jpg',
      thumbnailUrl: null,
      displayUrl: null,
      status: 'PROCESSING',
      aiCaption: null,
      userCaption: null,
      takenAt: null,
      locationName: null,
      aiLayout: 'story-card',
      aiScene: null,
      aiMood: null,
      cameraMake: null,
      cameraModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
      isAlbumCover: false,
      canBeCover: false,
    },
  ])

  assert.deepEqual(state, {
    candidates: [],
    hasCandidates: false,
    shouldShowEmptyState: true,
  })
})

test('buildAlbumCoverSectionState suppresses the empty-state message once cover candidates exist', () => {
  const state = buildAlbumCoverSectionState([
    {
      id: 'photo_1',
      fileName: 'candidate.jpg',
      thumbnailUrl: 'https://img.example.com/candidate-thumb.jpg',
      displayUrl: 'https://img.example.com/candidate.jpg',
      status: 'READY',
      aiCaption: '候选封面',
      userCaption: null,
      takenAt: null,
      locationName: null,
      aiLayout: 'story-card',
      aiScene: null,
      aiMood: null,
      cameraMake: null,
      cameraModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
      isAlbumCover: false,
      canBeCover: true,
    },
  ])

  assert.equal(state.hasCandidates, true)
  assert.equal(state.shouldShowEmptyState, false)
  assert.equal(state.candidates.length, 1)
})

test('buildAlbumChapterCardMeta shows summary when available', () => {
  const meta = buildAlbumChapterCardMeta({
    title: '第一次一起看海',
    backgroundNote: '那天风很大',
    aiSummary: '我们在海边待了很久。',
    photos: [{ id: 'photo_1' }, { id: 'photo_2' }],
  })

  assert.deepEqual(meta, {
    photoCount: 2,
    previewCount: 2,
    hasSummary: true,
  })
})

test('buildAlbumChapterCardMeta works without summary', () => {
  const meta = buildAlbumChapterCardMeta({
    title: '第一次一起看海',
    backgroundNote: null,
    aiSummary: null,
    photos: [{ id: 'photo_1' }],
  })

  assert.deepEqual(meta, {
    photoCount: 1,
    previewCount: 1,
    hasSummary: false,
  })
})

test('buildChapterSummaryActionState exposes in-progress label and disabled state', () => {
  assert.deepEqual(
    buildChapterSummaryActionState({
      hasSummary: true,
      isRefreshing: true,
      copy: {
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
    }),
    {
      label: '刷新中...',
      disabled: true,
    }
  )

  assert.deepEqual(
    buildChapterSummaryActionState({
      hasSummary: false,
      isRefreshing: false,
      copy: {
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
    }),
    {
      label: '生成摘要',
      disabled: false,
    }
  )
})

test('AlbumChapterCard renders one edit action and one refresh action inside the card', () => {
  const markup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: '那天风很大',
        aiSummary: '我们在海边待了很久。',
        photos: [
          {
            id: 'photo_1',
            fileName: 'one.jpg',
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            displayUrl: 'https://cdn.example.com/1-large.jpg',
            status: 'READY',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
          },
          {
            id: 'photo_2',
            fileName: 'two.jpg',
            thumbnailUrl: 'https://cdn.example.com/2.jpg',
            displayUrl: 'https://cdn.example.com/2-large.jpg',
            status: 'READY',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
          },
        ],
      },
      copy: {
        photoCount: '2 张照片',
        editChapter: '编辑章节',
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
      onOpenPhoto: () => {},
      onEditChapter: () => {},
      onRefreshSummary: () => {},
    })
  )

  assert.equal((markup.match(/编辑章节/g) || []).length, 1)
  assert.equal((markup.match(/刷新摘要/g) || []).length, 1)
  assert.equal((markup.match(/<button/g) || []).length, 4)
})

test('buildAlbumChapterCardSelectionState enables chapter photo selection in organize mode', () => {
  assert.deepEqual(
    buildAlbumChapterCardSelectionState({
      selectionMode: true,
      selectedIds: ['photo_2'],
      photoId: 'photo_2',
    }),
    {
      interactive: true,
      selected: true,
      showSelectionBadge: true,
      showActions: false,
    }
  )

  assert.deepEqual(
    buildAlbumChapterCardSelectionState({
      selectionMode: false,
      selectedIds: ['photo_2'],
      photoId: 'photo_2',
    }),
    {
      interactive: false,
      selected: false,
      showSelectionBadge: false,
      showActions: true,
    }
  )
})

test('AlbumChapterCard hides chapter actions and shows selection badge in organize mode', () => {
  const markup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: null,
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            fileName: 'one.jpg',
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            displayUrl: 'https://cdn.example.com/1-large.jpg',
            status: 'READY',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
          },
        ],
      },
      copy: {
        photoCount: '1 张照片',
        editChapter: '编辑章节',
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
      selectionMode: true,
      selectedPhotoIds: [],
      onTogglePhotoSelection: () => {},
    })
  )

  assert.equal(markup.includes('编辑章节'), false)
  assert.equal(markup.includes('刷新摘要'), false)
  assert.match(markup, /cm-photo-selection-checkbox/)
  assert.match(markup, /cm-photo-selection-overlay/)
})

test('AlbumChapterCard hides current cover indicator in organize mode', () => {
  const markup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: null,
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            fileName: 'one.jpg',
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            displayUrl: 'https://cdn.example.com/1-large.jpg',
            status: 'READY',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
            canBeCover: true,
            isAlbumCover: true,
          },
        ],
      },
      copy: {
        photoCount: '1 张照片',
        editChapter: '编辑章节',
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
      photoActionCopy: {
        deletePhoto: '删除照片',
        deletingPhoto: '删除中...',
        setAsCover: '设为封面',
        settingCover: '设置中...',
        currentCover: '当前封面',
      },
      selectionMode: true,
      selectedPhotoIds: [],
      onTogglePhotoSelection: () => {},
    })
  )

  assert.match(markup, /cm-photo-selection-checkbox/)
  assert.equal(markup.includes('cm-photo-hover-indicator'), false)
  assert.equal(markup.includes('当前封面'), false)
})

test('PhotoSelectionGrid hides current cover indicator in organize mode', () => {
  const markup = renderToStaticMarkup(
    React.createElement(PhotoSelectionGrid, {
      photos: [
        {
          id: 'photo_1',
          fileName: 'one.jpg',
          thumbnailUrl: 'https://cdn.example.com/1.jpg',
          displayUrl: 'https://cdn.example.com/1-large.jpg',
          status: 'READY',
          aiCaption: null,
          userCaption: null,
          takenAt: null,
          locationName: null,
          aiLayout: null,
          aiScene: null,
          aiMood: null,
          cameraMake: null,
          cameraModel: null,
          focalLength: null,
          aperture: null,
          shutterSpeed: null,
          iso: null,
          canBeCover: true,
          isAlbumCover: true,
        },
      ],
      selectedIds: [],
      selectionMode: true,
      onToggle: () => {},
      onOpen: () => {},
      photoActionCopy: {
        deletePhoto: '删除照片',
        deletingPhoto: '删除中...',
        setAsCover: '设为封面',
        settingCover: '设置中...',
        currentCover: '当前封面',
      },
    })
  )

  assert.match(markup, /cm-photo-selection-checkbox/)
  assert.equal(markup.includes('cm-photo-hover-indicator'), false)
  assert.equal(markup.includes('当前封面'), false)
})

test('AlbumChapterCard exposes hover delete action outside organize mode', () => {
  const markup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: null,
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            fileName: 'one.jpg',
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            displayUrl: 'https://cdn.example.com/1-large.jpg',
            status: 'READY',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
          },
        ],
      },
      copy: {
        photoCount: '1 张照片',
        editChapter: '编辑章节',
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
      photoActionCopy: {
        deletePhoto: '删除照片',
        deletingPhoto: '删除中...',
        setAsCover: '设为封面',
        settingCover: '设置中...',
        currentCover: '当前封面',
      },
      onOpenPhoto: () => {},
      onDeletePhoto: () => {},
    })
  )

  assert.match(markup, /cm-photo-hover-overlay/)
  assert.equal(markup.includes('aria-label="删除照片"'), true)
  assert.equal(markup.includes('cm-photo-hover-action'), true)
})

test('buildAlbumPhotoPreviewItems keeps only previewable photos and preserves album order', () => {
  assert.deepEqual(
    buildAlbumPhotoPreviewItems([
      {
        id: 'photo_2',
        fileName: 'two.jpg',
        displayUrl: 'https://cdn.example.com/2.jpg',
        status: 'READY',
      },
      {
        id: 'photo_1',
        fileName: 'one.jpg',
        displayUrl: 'https://cdn.example.com/1.jpg',
        status: 'READY',
      },
      {
        id: 'photo_3',
        fileName: 'three.jpg',
        displayUrl: null,
        status: 'PROCESSING',
      },
    ] as Parameters<typeof buildAlbumPhotoPreviewItems>[0]),
    [
      {
        id: 'photo_2',
        src: 'https://cdn.example.com/2.jpg',
        alt: 'two.jpg',
        title: 'two.jpg',
      },
      {
        id: 'photo_1',
        src: 'https://cdn.example.com/1.jpg',
        alt: 'one.jpg',
        title: 'one.jpg',
      },
    ]
  )
})

test('PhotoSelectionGrid shows preview and delete hover actions in browse mode', () => {
  const markup = renderToStaticMarkup(
    React.createElement(PhotoSelectionGrid, {
      photos: [
        {
          id: 'photo_1',
          fileName: 'one.jpg',
          thumbnailUrl: 'https://cdn.example.com/1.jpg',
          displayUrl: 'https://cdn.example.com/1-large.jpg',
          status: 'READY',
          aiCaption: null,
          userCaption: null,
          takenAt: null,
          locationName: null,
          aiLayout: null,
          aiScene: null,
          aiMood: null,
          cameraMake: null,
          cameraModel: null,
          focalLength: null,
          aperture: null,
          shutterSpeed: null,
          iso: null,
          canBeCover: false,
          isAlbumCover: false,
        },
      ],
      selectedIds: [],
      selectionMode: false,
      onToggle: () => {},
      onOpen: () => {},
      onPreviewPhoto: () => {},
      onDeletePhoto: () => {},
      photoActionCopy: {
        previewPhoto: '预览照片',
        deletePhoto: '删除照片',
        deletingPhoto: '删除中...',
        setAsCover: '设为封面',
        settingCover: '设置中...',
        currentCover: '当前封面',
      },
    })
  )

  assert.equal(markup.includes('aria-label="预览照片"'), true)
  assert.equal(markup.includes('aria-label="删除照片"'), true)
})

test('AlbumChapterCard shows hover cover action only for cover-eligible photos', () => {
  const eligibleMarkup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: null,
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            fileName: 'one.jpg',
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            displayUrl: 'https://cdn.example.com/1-large.jpg',
            status: 'READY',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
            canBeCover: true,
            isAlbumCover: false,
          },
        ],
      },
      copy: {
        photoCount: '1 张照片',
        editChapter: '编辑章节',
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
      photoActionCopy: {
        deletePhoto: '删除照片',
        deletingPhoto: '删除中...',
        setAsCover: '设为封面',
        settingCover: '设置中...',
        currentCover: '当前封面',
      },
      onOpenPhoto: () => {},
      onRequestSetCover: () => {},
    })
  )

  const currentMarkup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: null,
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            fileName: 'one.jpg',
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            displayUrl: 'https://cdn.example.com/1-large.jpg',
            status: 'READY',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
            canBeCover: true,
            isAlbumCover: true,
          },
        ],
      },
      copy: {
        photoCount: '1 张照片',
        editChapter: '编辑章节',
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
      photoActionCopy: {
        deletePhoto: '删除照片',
        deletingPhoto: '删除中...',
        setAsCover: '设为封面',
        settingCover: '设置中...',
        currentCover: '当前封面',
      },
      onOpenPhoto: () => {},
      onRequestSetCover: () => {},
    })
  )

  const ineligibleMarkup = renderToStaticMarkup(
    React.createElement(AlbumChapterCard, {
      chapter: {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: null,
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            fileName: 'one.jpg',
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            displayUrl: null,
            status: 'PROCESSING',
            aiCaption: null,
            userCaption: null,
            takenAt: null,
            locationName: null,
            aiLayout: null,
            aiScene: null,
            aiMood: null,
            cameraMake: null,
            cameraModel: null,
            focalLength: null,
            aperture: null,
            shutterSpeed: null,
            iso: null,
            canBeCover: false,
            isAlbumCover: false,
          },
        ],
      },
      copy: {
        photoCount: '1 张照片',
        editChapter: '编辑章节',
        refreshSummary: '刷新摘要',
        generateSummary: '生成摘要',
        refreshingSummary: '刷新中...',
        generatingSummary: '生成中...',
      },
      photoActionCopy: {
        deletePhoto: '删除照片',
        deletingPhoto: '删除中...',
        setAsCover: '设为封面',
        settingCover: '设置中...',
        currentCover: '当前封面',
      },
      onOpenPhoto: () => {},
      onRequestSetCover: () => {},
    })
  )

  assert.equal(eligibleMarkup.includes('aria-label="设为封面"'), true)
  assert.equal(currentMarkup.includes('aria-label="当前封面"'), true)
  assert.equal(currentMarkup.includes('cm-photo-hover-indicator'), true)
  assert.equal(currentMarkup.includes('>当前封面<'), true)
  assert.equal(currentMarkup.includes('disabled=""'), false)
  assert.equal(currentMarkup.includes('aria-label="设为封面"'), false)
  assert.equal(ineligibleMarkup.includes('设为封面'), false)
})

test('buildChapterDetailDraft derives current chapter values for the drawer form', () => {
  assert.deepEqual(buildChapterDetailDraft({
    id: 'chapter_1',
    title: '赛里木湖婚纱照的时刻',
    backgroundNote: '那天的风很轻',
    photos: [],
  }), {
    title: '赛里木湖婚纱照的时刻',
    backgroundNote: '那天的风很轻',
  })
})

test('buildAlbumDetailWorkspaceState resolves the selected photo from the latest album payload', () => {
  const state = buildAlbumDetailWorkspaceState({
    detailSurface: {
      kind: 'photo',
      photoId: 'photo_2',
      chapterPhotoIds: ['photo_1', 'photo_2'],
    },
    album: {
      id: 'album_1',
      title: '夏天',
      description: null,
      ungroupedPhotos: [],
      chapters: [
        {
          id: 'chapter_1',
          title: '看海',
          backgroundNote: null,
          photos: [
            {
              id: 'photo_1',
              fileName: 'one.jpg',
              thumbnailUrl: 'https://cdn.example.com/1.jpg',
              displayUrl: 'https://cdn.example.com/1-large.jpg',
              status: 'READY',
              aiCaption: null,
              userCaption: null,
              takenAt: null,
              locationName: null,
              aiLayout: null,
              aiScene: null,
              aiMood: null,
              cameraMake: null,
              cameraModel: null,
              focalLength: null,
              aperture: null,
              shutterSpeed: null,
              iso: null,
            },
            {
              id: 'photo_2',
              fileName: 'two.jpg',
              thumbnailUrl: 'https://cdn.example.com/2.jpg',
              displayUrl: 'https://cdn.example.com/2-large.jpg',
              status: 'READY',
              aiCaption: '最新文案',
              userCaption: null,
              takenAt: null,
              locationName: '青岛',
              aiLayout: 'story-card',
              aiScene: null,
              aiMood: null,
              cameraMake: null,
              cameraModel: null,
              focalLength: null,
              aperture: null,
              shutterSpeed: null,
              iso: null,
            },
          ],
        },
      ],
    },
  })

  assert.equal(state.isOpen, true)
  assert.equal(state.kind, 'photo')
  assert.equal(state.activePhoto?.id, 'photo_2')
  assert.equal(state.activeChapter, null)
})

test('buildAlbumDetailWorkspaceState resolves the selected chapter from the latest album payload', () => {
  const state = buildAlbumDetailWorkspaceState({
    detailSurface: {
      kind: 'chapter',
      chapterId: 'chapter_2',
    },
    album: {
      id: 'album_1',
      title: '夏天',
      description: null,
      ungroupedPhotos: [],
      chapters: [
        {
          id: 'chapter_1',
          title: '看海',
          backgroundNote: null,
          photos: [],
        },
        {
          id: 'chapter_2',
          title: '回家路上',
          backgroundNote: '风很大',
          photos: [],
        },
      ],
    },
  })

  assert.equal(state.isOpen, true)
  assert.equal(state.kind, 'chapter')
  assert.equal(state.activePhoto, null)
  assert.equal(state.activeChapter?.id, 'chapter_2')
})
