type SortablePhoto = {
  id: string
  sortOrder: number
}

export function reindexPhotoSortOrders<T extends SortablePhoto>(photos: T[]) {
  return photos.map((photo, index) => ({
    id: photo.id,
    sortOrder: index + 1,
  }))
}
