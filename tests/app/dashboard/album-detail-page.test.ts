import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  buildAlbumCoverCandidates,
  buildAlbumDescriptionDraftSuggestion,
  buildAlbumDetailUiText,
  buildAlbumNarrativeComparison,
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
} from '../../../src/components/album-chapter-card'
import {
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
  assert.equal(uiText.createChapterFailed, 'createChapterFailed')
  assert.equal(uiText.summaryUpdated, 'summaryUpdated')
  assert.equal(uiText.narrative.editAlbum, 'narrativeEditAlbum')
  assert.equal(uiText.narrative.saveAlbum, 'narrativeSaveAlbum')
  assert.equal(uiText.narrative.generateDescriptionDraft, 'narrativeGenerateDescriptionDraft')
  assert.equal(uiText.narrative.generateTitleDraft, 'narrativeGenerateTitleDraft')
  assert.equal(uiText.narrative.coverCandidates, 'narrativeCoverCandidates')
  assert.equal(uiText.narrative.setAsCover, 'narrativeSetAsCover')
  assert.equal(uiText.narrative.currentCover, 'narrativeCurrentCover')
  assert.equal(uiText.narrative.aiTitleLabel, 'narrativeAiTitleLabel')
  assert.equal(uiText.narrative.currentTitleLabel, 'narrativeCurrentTitleLabel')
  assert.equal(uiText.narrative.aiDescriptionLabel, 'narrativeAiDescriptionLabel')
  assert.equal(uiText.narrative.currentDescriptionLabel, 'narrativeCurrentDescriptionLabel')
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
    order: ['chapters', 'ungrouped'],
  })
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
