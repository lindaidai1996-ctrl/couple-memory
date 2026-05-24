type MediaTileClassNameOptions = {
  className?: string
}

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function mediaTileButtonClassName({
  className,
}: MediaTileClassNameOptions = {}) {
  return joinClassNames(
    'cm-media-tile',
    'group relative block w-full appearance-none border-0 bg-transparent p-0 text-left',
    'cursor-pointer transition duration-200 focus:outline-none',
    className
  )
}
