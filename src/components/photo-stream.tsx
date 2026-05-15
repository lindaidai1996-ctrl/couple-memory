'use client'

import { motion } from 'framer-motion'
import type { LayoutPhotoData } from './layouts/cinema-wide'
import { CinemaWide } from './layouts/cinema-wide'
import { SideBySide } from './layouts/side-by-side'
import { PortraitHero } from './layouts/portrait-hero'
import { GridSquare } from './layouts/grid-square'
import { StoryCard } from './layouts/story-card'

interface StreamPhoto extends LayoutPhotoData {
  aiLayout: string
  aiCaption: string | null
  userCaption: string | null
}

interface PhotoStreamProps {
  photos: StreamPhoto[]
}

const scrollReveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
}

function renderLayoutItem(photo: StreamPhoto, index: number) {
  const caption = photo.userCaption || photo.aiCaption
  const props = { photo, caption, index }

  switch (photo.aiLayout) {
    case 'cinema-wide':
      return <CinemaWide {...props} />
    case 'portrait-hero':
      return <PortraitHero {...props} />
    case 'grid-square':
      return <GridSquare {...props} />
    case 'story-card':
      return <StoryCard {...props} />
    case 'side-by-side':
    default:
      return <SideBySide {...props} />
  }
}

export function PhotoStream({ photos }: PhotoStreamProps) {
  const groups = groupPhotos(photos)

  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4">
      {groups.map((group, gi) => {
        if (group.type === 'grid') {
          return (
            <motion.div key={`grid-${gi}`} {...scrollReveal}
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              {group.photos.map((p, i) => (
                <div key={p.id}>
                  {renderLayoutItem(p, i)}
                </div>
              ))}
            </motion.div>
          )
        }

        const photo = group.photos[0]
        return (
          <motion.div key={photo.id} {...scrollReveal}>
            {renderLayoutItem(photo, gi)}
          </motion.div>
        )
      })}
    </div>
  )
}

type PhotoGroup =
  | { type: 'single'; photos: [StreamPhoto] }
  | { type: 'grid'; photos: StreamPhoto[] }

function groupPhotos(photos: StreamPhoto[]): PhotoGroup[] {
  const groups: PhotoGroup[] = []
  let gridBuffer: StreamPhoto[] = []

  const flushGrid = () => {
    if (gridBuffer.length > 0) {
      groups.push({ type: 'grid', photos: gridBuffer })
      gridBuffer = []
    }
  }

  for (const photo of photos) {
    if (photo.aiLayout === 'grid-square') {
      gridBuffer.push(photo)
    } else {
      flushGrid()
      groups.push({ type: 'single', photos: [photo] })
    }
  }
  flushGrid()

  return groups
}
