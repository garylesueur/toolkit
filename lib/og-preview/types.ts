export type OgTagData = {
  /** Standard Open Graph tags */
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  ogUrl: string | null
  ogType: string | null
  ogSiteName: string | null
  ogLocale: string | null

  /** Twitter/X card tags */
  twitterCard: string | null
  twitterTitle: string | null
  twitterDescription: string | null
  twitterImage: string | null
  twitterSite: string | null
  twitterCreator: string | null

  /** HTML fallbacks */
  htmlTitle: string | null
  metaDescription: string | null

  /** All raw meta tags found (property/name -> content) */
  rawTags: Array<{ property: string; content: string }>
}

export type OgFetchSuccess = {
  ok: true
  data: OgTagData
}

export type OgFetchError = {
  ok: false
  error: string
  isCors: boolean
}

export type OgFetchResult = OgFetchSuccess | OgFetchError
