// BE Tag.name 컬럼 길이와 맞춘다. (Tag.java: @Column(length = 50))
export const TIL_TAG_MAX_LENGTH = 50
export const TIL_TAG_MAX_COUNT = 8

export function normalizeTilTag(value: string) {
  return value.trim().replace(/^#/, '')
}

export function getTooLongTilTags(tags: string[]) {
  return tags.filter((tag) => normalizeTilTag(String(tag)).length > TIL_TAG_MAX_LENGTH)
}
