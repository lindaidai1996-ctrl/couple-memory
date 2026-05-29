import type { MemorySitePhotoRecord, MemorySitePayloadRecord } from './site-builder'

export type MemorySitePageSectionModel = {
  chapterId: string
  kicker: string
  title: string
  summary: string
  layout: 'imageLeft' | 'imageRight'
  photos: MemorySitePhotoRecord[]
}

export type MemorySitePreviewInput = {
  title: string
  subtitle: string | null
  intro: string
  closing: string
  coverPhotoUrl: string | null
  payload: {
    style: MemorySitePayloadRecord['style'] | string
    sections: MemorySitePayloadRecord['sections']
  }
}

export function buildMemorySitePreviewModel(site: MemorySitePreviewInput) {
  const sections = site.payload.sections.slice(0, 7)

  return {
    ...site,
    sections: sections.map((section, index) => ({
      ...section,
      kicker: `Chapter ${String(index + 1).padStart(2, '0')}`,
      layout: index % 2 === 0 ? 'imageLeft' : 'imageRight',
    })) as MemorySitePageSectionModel[],
  }
}
