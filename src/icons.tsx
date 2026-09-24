import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const IconGrid = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
export const IconClipboard = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 5h6M8 4h8v3H8z" />
    <rect x="5" y="6" width="14" height="14" rx="2" />
    <path d="M9 12h6M9 16h4" />
  </svg>
)
export const IconUsers = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M16 19a4.5 4.5 0 0 0 5-4.2" />
  </svg>
)
export const IconChart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 19V5M4 19h16" />
    <path d="M8 15v-4M12 15V8M16 15v-7" />
  </svg>
)
export const IconShield = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3 5 6v6c0 4.2 3 6.8 7 8.5C16 18.8 19 16.2 19 12V6l-7-3Z" />
    <path d="M9.5 12.2 11.2 14l3.4-3.8" />
  </svg>
)
export const IconSun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
export const IconMoon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 14.5A7.5 7.5 0 1 1 10.2 5.2 6 6 0 0 0 18 14.5Z" />
  </svg>
)
export const IconLock = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)
export const IconCamera = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
)
export const IconLogout = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 17H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />
    <path d="M14 16l4-4-4-4M18 12H9" />
  </svg>
)
export const IconPlus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)
export const IconEdit = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h4l10-10-4-4L4 16v4Z" />
    <path d="M13 7l4 4" />
  </svg>
)
export const IconTrash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" />
  </svg>
)
export const IconBack = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15 5 8 12l7 7" />
  </svg>
)
export const IconMail = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
)
export const IconKey = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="15" r="3.2" />
    <path d="M11 15h10v-2l-3 0 0-2-3 .1" />
  </svg>
)
export const IconX = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconTimer = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 1.5M9 4h6" />
  </svg>
)
export const IconBell = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
)
export const IconSpark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l1.4 5.2L18 9.5l-4.6 1.4L12 16l-1.4-5.1L6 9.5l4.6-1.3L12 3Z" />
    <path d="M19 14l.6 2.2 2.2.6-2.2.6L19 20l-.6-2.2-2.2-.6 2.2-.6L19 14Z" />
    <path d="M5 15l.5 1.6L7 17.2l-1.5.5L5 19.2l-.5-1.5-1.5-.5 1.5-.6L5 15Z" />
  </svg>
)
export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </svg>
)
