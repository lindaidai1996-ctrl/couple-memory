import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMemorySite } from '../../src/lib/memory-sites/site-builder'

test('buildMemorySite turns chapter content into a balanced editorial payload', () => {
  const site = buildMemorySite({
    coupleName: '月亮与晚风',
    style: 'VELVET_PLUM_EDITORIAL',
    startDate: new Date('2024-02-14T00:00:00.000Z'),
    albums: [
      {
        id: 'album_1',
        title: '在一起的第一年',
        description: '从春天到冬天，照片越来越像一本我们自己写的书。',
        coverPhotoUrl: 'https://img.example.com/cover.jpg',
      },
    ],
    chapters: [
      {
        id: 'chapter_1',
        albumId: 'album_1',
        title: '春天散步',
        aiSummary: '天气刚刚回暖，你们开始习惯一起绕远路回家。',
        photos: [
          {
            id: 'photo_1',
            displayUrl: 'https://img.example.com/1.jpg',
            thumbnailUrl: 'https://img.example.com/1-thumb.jpg',
            takenAt: new Date('2024-03-01T10:00:00.000Z'),
            locationName: '广州',
            userCaption: '一起吃完饭又走了很久。',
            aiCaption: null,
            aiMood: 'warm',
          },
          {
            id: 'photo_2',
            displayUrl: 'https://img.example.com/2.jpg',
            thumbnailUrl: 'https://img.example.com/2-thumb.jpg',
            takenAt: new Date('2024-03-01T10:30:00.000Z'),
            locationName: '广州',
            userCaption: null,
            aiCaption: '晚风把这段时间吹得很慢。',
            aiMood: 'calm',
          },
        ],
      },
      {
        id: 'chapter_2',
        albumId: 'album_1',
        title: '海边旅行',
        aiSummary: '第一次把好天气和海风一起留在同一个章节里。',
        photos: [
          {
            id: 'photo_3',
            displayUrl: 'https://img.example.com/3.jpg',
            thumbnailUrl: 'https://img.example.com/3-thumb.jpg',
            takenAt: new Date('2024-05-02T08:00:00.000Z'),
            locationName: '汕头',
            userCaption: null,
            aiCaption: '海边把你们的这一段写得更开阔。',
            aiMood: 'open',
          },
        ],
      },
    ],
  })

  assert.equal(site.sections.length, 2)
  assert.equal(site.sections[0]?.chapterId, 'chapter_1')
  assert.equal(site.sections[0]?.photos[0]?.role, 'hero')
  assert.equal(site.sections[0]?.photos.some(photo => photo.role === 'detail'), true)
  assert.equal(site.coverPhotoUrl, 'https://img.example.com/cover.jpg')
  assert.match(site.intro, /第一年|春天|冬天/)
  assert.deepEqual(site.payload.albumIds, ['album_1'])
  assert.deepEqual(site.payload.chapterIds, ['chapter_1', 'chapter_2'])
})

test('buildMemorySite supports cross-album chapter ranges and rotates selections by variant', () => {
  const site = buildMemorySite({
    coupleName: '月亮与晚风',
    style: 'VELVET_PLUM_EDITORIAL',
    startDate: null,
    selectionVariant: 1,
    albums: [
      {
        id: 'album_1',
        title: '春天',
        description: null,
        coverPhotoUrl: null,
      },
      {
        id: 'album_2',
        title: '夏天',
        description: '夏天更适合重新翻出来看。',
        coverPhotoUrl: null,
      },
    ],
    chapters: [
      {
        id: 'chapter_1',
        albumId: 'album_1',
        title: '散步',
        aiSummary: null,
        photos: [
          {
            id: 'photo_1',
            displayUrl: 'https://img.example.com/1.jpg',
            thumbnailUrl: null,
            takenAt: null,
            locationName: null,
            userCaption: '第一张',
            aiCaption: null,
            aiMood: null,
          },
          {
            id: 'photo_2',
            displayUrl: 'https://img.example.com/2.jpg',
            thumbnailUrl: null,
            takenAt: null,
            locationName: null,
            userCaption: '第二张',
            aiCaption: null,
            aiMood: null,
          },
        ],
      },
      {
        id: 'chapter_2',
        albumId: 'album_2',
        title: '旅行',
        aiSummary: null,
        photos: [
          {
            id: 'photo_3',
            displayUrl: 'https://img.example.com/3.jpg',
            thumbnailUrl: null,
            takenAt: null,
            locationName: null,
            userCaption: '第三张',
            aiCaption: null,
            aiMood: null,
          },
        ],
      },
    ],
  })

  assert.equal(site.title, '月亮与晚风 的阶段纪念站')
  assert.equal(site.sections[0]?.chapterId, 'chapter_2')
  assert.equal(site.sections[1]?.photos[0]?.id, 'photo_2')
  assert.equal(site.payload.selectionVariant, 1)
  assert.deepEqual(site.payload.albumIds, ['album_1', 'album_2'])
})
