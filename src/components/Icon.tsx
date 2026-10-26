const paths = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  plus: 'M12 5v14M5 12h14', book: 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  'chevron-left': 'm15 6-6 6 6 6', 'chevron-right': 'm9 6 6 6-6 6',
  check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  cloud: 'M6 18a5 5 0 1 1 0-10 6 6 0 0 1 12-1 5.5 5.5 0 0 1 0 11Z',
  leaf: 'M20 3C9 2 2 8 5 15c3 7 14 4 15-12ZM5 21l10-12',
  'arrow-right': 'M4 12h16m-6-6 6 6-6 6',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z',
}
export type IconName = keyof typeof paths
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
