type CoverMode = 'AUTO' | 'MANUAL'
type PhotoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'

type CoverPhoto = {
  id: string
  status: PhotoStatus
  displayUrl: string | null
  sortOrder: number
}

type ResolveAlbumCoverInput = {
  coverMode: CoverMode
  coverPhotoId: string | null
  photos: CoverPhoto[]
}

type ResolvedAlbumCover = {
  photoId: string
  coverUrl: string
}

function isCoverEligible(photo: CoverPhoto) {
  return photo.status === 'READY' && Boolean(photo.displayUrl)
}

export function resolveAlbumCover(
  input: ResolveAlbumCoverInput
): ResolvedAlbumCover | null {
  const sortedPhotos = [...input.photos].sort((a, b) => a.sortOrder - b.sortOrder)

  if (input.coverMode === 'MANUAL' && input.coverPhotoId) {
    const manualPhoto = sortedPhotos.find(photo => photo.id === input.coverPhotoId)
    if (manualPhoto && isCoverEligible(manualPhoto) && manualPhoto.displayUrl) {
      return {
        photoId: manualPhoto.id,
        coverUrl: manualPhoto.displayUrl,
      }
    }
  }

  const autoPhoto = sortedPhotos.find(isCoverEligible)
  if (!autoPhoto?.displayUrl) {
    return null
  }

  return {
    photoId: autoPhoto.id,
    coverUrl: autoPhoto.displayUrl,
  }
}
