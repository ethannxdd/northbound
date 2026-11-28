// Small line icons drawn for Northbound. 24px grid, 1.8 stroke, inherit colour.
const PATHS: Record<string, string> = {
  home: 'M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  map: 'M6 3v18M6 8c0 3 6 2 6 6v7M12 3v6M18 3v18',
  money: 'M3 7h18v12H3zM3 11h18M7 15h3',
  life: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z',
  compare: 'M4 5h7v14H4zM13 5h7v14h-7z',
  progress: 'M12 3v18M12 3l-4 4M12 3l4 4M8 21h8',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  settings: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  back: 'M15 6l-6 6 6 6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  check: 'M5 12.5l4.5 4.5L19 7',
  scenarios: 'M4 6h16M4 12h16M4 18h10',
  rules: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  appearance: 'M12 3a9 9 0 1 0 0 18V3z',
  savings: 'M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5S9.8 10 12 10.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v8h14v-8',
  docs: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h4',
  flag: 'M5 21V4h11l-1 4 1 4H5',
  rand: 'M7 20V4h5a4 4 0 0 1 0 8H7M11 12l5 8',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM16 16l4.5 4.5',
  job: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
}

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 20 }: { name: IconName | string; size?: number }) {
  // Loot's own app icon, copied from the Loot repo (public/icons/app-icon.svg).
  if (name === 'loot') return <img src="/loot-icon.svg" className="loot-icon" width={size} height={size} alt="" />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}
