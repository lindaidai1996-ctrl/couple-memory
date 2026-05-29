import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPublishMemorySiteHandler,
} from '../../src/app/api/couples/[coupleId]/memory-sites/[siteId]/route'
import {
  createGenerateMemorySiteHandler,
} from '../../src/app/api/couples/[coupleId]/memory-sites/generate/route'
import {
  createListMemorySitesHandler,
} from '../../src/app/api/couples/[coupleId]/memory-sites/route'

function createAuthContext(coupleId = 'couple_1', plan = 'pro') {
  return {
    userId: 'user_1',
    coupleUser: {
      coupleId,
      role: 'OWNER',
      couple: {
        plan,
      },
    },
  } as never
}

function createChapterPhoto(id: string, caption: string) {
  return {
    id,
    displayUrl: `https://img.example.com/${id}.jpg`,
    thumbnailUrl: null,
    takenAt: null,
    locationName: null,
    userCaption: caption,
    aiCaption: null,
    aiMood: 'warm',
  }
}

test('POST generate route creates a READY draft from cross-album chapter content', async () => {
  const response = await createGenerateMemorySiteHandler({
    prismaClient: {
      couple: {
        findFirst: async () => ({
          id: 'couple_1',
          name: '月亮与晚风',
          startDate: new Date('2024-02-14T00:00:00.000Z'),
          albums: [
            {
              id: 'album_1',
              title: '第一年',
              description: 'desc',
              coverPhotoUrl: 'https://img.example.com/cover.jpg',
              chapters: [
                {
                  id: 'chapter_1',
                  title: '春天散步',
                  aiSummary: 'summary',
                  photos: [createChapterPhoto('photo_1', 'caption')],
                },
              ],
            },
            {
              id: 'album_2',
              title: '第二年',
              description: null,
              coverPhotoUrl: null,
              chapters: [
                {
                  id: 'chapter_2',
                  title: '夏天旅行',
                  aiSummary: 'summary 2',
                  photos: [createChapterPhoto('photo_2', 'caption 2')],
                },
              ],
            },
          ],
        }),
      },
      album: {
        findFirst: async () => null,
      },
      memorySite: {
        upsert: async ({ create, update }: { create: { sourceChapterIds: string[] }, update: { sourceChapterIds: string[] } }) => ({
          id: 'site_1',
          status: 'READY',
          sourceChapterIds: create.sourceChapterIds,
          updatedSourceChapterIds: update.sourceChapterIds,
        }),
      },
    } as never,
  })(
    new Request('http://localhost/api/couples/couple_1/memory-sites/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterIds: ['chapter_1', 'chapter_2'], style: 'VELVET_PLUM_EDITORIAL' }),
    }),
    createAuthContext()
  )

  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.site.status, 'READY')
  assert.deepEqual(body.site.sourceChapterIds, ['chapter_1', 'chapter_2'])
})

test('list route returns mapped site items', async () => {
  const response = await createListMemorySitesHandler({
    prismaClient: {
      memorySite: {
        findMany: async () => [
          {
            id: 'site_1',
            scopeKey: 'chapters:chapter_1,chapter_2:style:VELVET_PLUM_EDITORIAL',
            title: '在一起的第一年',
            subtitle: '副标题',
            intro: '引子',
            closing: '结尾',
            coverPhotoUrl: null,
            style: 'VELVET_PLUM_EDITORIAL',
            status: 'READY',
            publishedAt: null,
            payload: { style: 'VELVET_PLUM_EDITORIAL', sections: [], chapterIds: ['chapter_1', 'chapter_2'] },
            sourceAlbumId: null,
            sourceChapterIds: ['chapter_1', 'chapter_2'],
          },
        ],
      },
    } as never,
  })(new Request('http://localhost'), createAuthContext())

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.sites[0].title, '在一起的第一年')
})

test('PATCH publish route allows free-plan publish attempts', async () => {
  let publishedCoupleId: string | null = null
  const response = await createPublishMemorySiteHandler({
    prismaClient: {
      couple: {
        findFirst: async () => null,
        update: async ({ where }: { where: { id: string } }) => {
          publishedCoupleId = where.id
          return { id: 'couple_1', isPublic: true }
        },
      },
      album: {
        findFirst: async () => null,
      },
      memorySite: {
        findFirst: async () => ({
          id: 'site_1',
          coupleId: 'couple_1',
          style: 'VELVET_PLUM_EDITORIAL',
          title: '标题',
          subtitle: null,
          intro: '引子',
          closing: '结尾',
          coverPhotoUrl: null,
          status: 'READY',
          payload: { style: 'VELVET_PLUM_EDITORIAL', sections: [] },
          sourceChapterIds: ['chapter_1'],
          publishedAt: null,
        }),
        update: async () => ({
          id: 'site_1',
          status: 'PUBLISHED',
        }),
      },
    } as never,
  })(
    new Request('http://localhost/api/couples/couple_1/memory-sites/site_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    }),
    createAuthContext('couple_1', 'free'),
    { siteId: 'site_1' }
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.site.status, 'PUBLISHED')
  assert.equal(publishedCoupleId, 'couple_1')
})

test('PATCH editCopy updates top-level copy and chapter copy', async () => {
  const response = await createPublishMemorySiteHandler({
    prismaClient: {
      couple: {
        findFirst: async () => null,
        update: async () => null,
      },
      album: {
        findFirst: async () => null,
      },
      memorySite: {
        findFirst: async () => ({
          id: 'site_1',
          coupleId: 'couple_1',
          style: 'VELVET_PLUM_EDITORIAL',
          title: '旧标题',
          subtitle: '旧副标题',
          intro: '旧引子',
          closing: '旧结尾',
          coverPhotoUrl: null,
          status: 'READY',
          payload: {
            style: 'VELVET_PLUM_EDITORIAL',
            sectionCount: 1,
            sections: [
              {
                chapterId: 'chapter_1',
                title: '旧章节',
                summary: '旧摘要',
                photos: [],
              },
            ],
          },
          sourceChapterIds: ['chapter_1'],
          publishedAt: null,
        }),
        update: async ({ data }: { data: { title: string, payload: { sections: Array<{ title: string, summary: string }> } } }) => ({
          id: 'site_1',
          title: data.title,
          payload: data.payload,
          style: 'VELVET_PLUM_EDITORIAL',
          status: 'READY',
          subtitle: '新副标题',
          intro: '新引子',
          closing: '新结尾',
          coverPhotoUrl: null,
          publishedAt: null,
          sourceChapterIds: ['chapter_1'],
        }),
      },
    } as never,
  })(
    new Request('http://localhost/api/couples/couple_1/memory-sites/site_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'editCopy',
        title: '新标题',
        subtitle: '新副标题',
        intro: '新引子',
        closing: '新结尾',
        sections: [{ chapterId: 'chapter_1', title: '新章节', summary: '新摘要' }],
      }),
    }),
    createAuthContext(),
    { siteId: 'site_1' }
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.site.title, '新标题')
  assert.equal(payload.site.payload.sections[0].title, '新章节')
})

test('PATCH regenerateSelection rebuilds the site from the same source chapters', async () => {
  const response = await createPublishMemorySiteHandler({
    prismaClient: {
      couple: {
        findFirst: async () => ({
          id: 'couple_1',
          name: '月亮与晚风',
          startDate: null,
          albums: [
            {
              id: 'album_1',
              title: '第一年',
              description: null,
              coverPhotoUrl: null,
              chapters: [
                {
                  id: 'chapter_1',
                  title: '散步',
                  aiSummary: null,
                  photos: [createChapterPhoto('photo_1', '第一张'), createChapterPhoto('photo_2', '第二张')],
                },
              ],
            },
          ],
        }),
        update: async () => null,
      },
      album: {
        findFirst: async () => null,
      },
      memorySite: {
        findFirst: async () => ({
          id: 'site_1',
          coupleId: 'couple_1',
          style: 'VELVET_PLUM_EDITORIAL',
          title: '旧标题',
          subtitle: '副标题',
          intro: '引子',
          closing: '结尾',
          coverPhotoUrl: null,
          status: 'READY',
          payload: {
            style: 'VELVET_PLUM_EDITORIAL',
            sectionCount: 1,
            selectionVariant: 0,
            sections: [
              {
                chapterId: 'chapter_1',
                title: '章节标题',
                summary: '章节摘要',
                photos: [
                  {
                    id: 'photo_1',
                    imageUrl: 'https://img.example.com/photo_1.jpg',
                    role: 'hero',
                    narrative: '第一张',
                    locationName: null,
                    takenAt: null,
                  },
                ],
              },
            ],
          },
          sourceChapterIds: ['chapter_1'],
          publishedAt: null,
        }),
        update: async ({ data }: { data: { payload: { selectionVariant: number, sections: Array<{ photos: Array<{ id: string }> }> } } }) => ({
          id: 'site_1',
          style: 'VELVET_PLUM_EDITORIAL',
          status: 'READY',
          title: '旧标题',
          subtitle: '副标题',
          intro: '引子',
          closing: '结尾',
          coverPhotoUrl: null,
          payload: data.payload,
          sourceChapterIds: ['chapter_1'],
          publishedAt: null,
        }),
      },
    } as never,
  })(
    new Request('http://localhost/api/couples/couple_1/memory-sites/site_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerateSelection' }),
    }),
    createAuthContext(),
    { siteId: 'site_1' }
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.site.payload.selectionVariant, 1)
})

test('PATCH replacePhoto swaps one displayed photo within the same chapter', async () => {
  const response = await createPublishMemorySiteHandler({
    prismaClient: {
      couple: {
        findFirst: async () => ({
          id: 'couple_1',
          name: '月亮与晚风',
          startDate: null,
          albums: [
            {
              id: 'album_1',
              title: '第一年',
              description: null,
              coverPhotoUrl: null,
              chapters: [
                {
                  id: 'chapter_1',
                  title: '散步',
                  aiSummary: null,
                  photos: [
                    createChapterPhoto('photo_1', '第一张'),
                    createChapterPhoto('photo_2', '第二张'),
                  ],
                },
              ],
            },
          ],
        }),
        update: async () => null,
      },
      album: {
        findFirst: async () => null,
      },
      memorySite: {
        findFirst: async () => ({
          id: 'site_1',
          coupleId: 'couple_1',
          style: 'VELVET_PLUM_EDITORIAL',
          title: '旧标题',
          subtitle: '副标题',
          intro: '引子',
          closing: '结尾',
          coverPhotoUrl: 'https://img.example.com/photo_1.jpg',
          status: 'READY',
          payload: {
            style: 'VELVET_PLUM_EDITORIAL',
            sectionCount: 1,
            sections: [
              {
                chapterId: 'chapter_1',
                title: '章节标题',
                summary: '章节摘要',
                photos: [
                  {
                    id: 'photo_1',
                    imageUrl: 'https://img.example.com/photo_1.jpg',
                    role: 'hero',
                    narrative: '第一张',
                    locationName: null,
                    takenAt: null,
                  },
                ],
              },
            ],
          },
          sourceChapterIds: ['chapter_1'],
          publishedAt: null,
        }),
        update: async ({ data }: { data: { coverPhotoUrl: string, payload: { sections: Array<{ photos: Array<{ id: string }> }> } } }) => ({
          id: 'site_1',
          style: 'VELVET_PLUM_EDITORIAL',
          status: 'READY',
          title: '旧标题',
          subtitle: '副标题',
          intro: '引子',
          closing: '结尾',
          coverPhotoUrl: data.coverPhotoUrl,
          payload: data.payload,
          sourceChapterIds: ['chapter_1'],
          publishedAt: null,
        }),
      },
    } as never,
  })(
    new Request('http://localhost/api/couples/couple_1/memory-sites/site_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'replacePhoto',
        chapterId: 'chapter_1',
        currentPhotoId: 'photo_1',
        replacementPhotoId: 'photo_2',
      }),
    }),
    createAuthContext(),
    { siteId: 'site_1' }
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.site.coverPhotoUrl, 'https://img.example.com/photo_2.jpg')
  assert.equal(payload.site.payload.sections[0].photos[0].id, 'photo_2')
})
