import type { JSX } from 'react'

interface IconProps {
  size?: number
}

function base(size: number, strokeWidth: number): JSX.IntrinsicElements['svg'] {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false
  }
}

export function IconPlus({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg {...base(size, 2)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconClose({ size = 10 }: IconProps): JSX.Element {
  return (
    <svg {...base(size, 3)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconFolder({ size = 13 }: IconProps): JSX.Element {
  return (
    <svg {...base(size, 2)}>
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  )
}

export function IconPipette({ size = 14 }: IconProps): JSX.Element {
  return (
    <svg {...base(size, 2)}>
      <path d="M14 4l6 6M4 20l1-5 9-9 4 4-9 9z" />
    </svg>
  )
}

export function IconExport({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg {...base(size, 2.2)}>
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
  )
}

export function IconAlert({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg {...base(size, 2)}>
      <path d="M12 8v5M12 16.5v.01M10.3 4.2L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" />
    </svg>
  )
}
