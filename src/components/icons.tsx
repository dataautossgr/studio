import type { SVGProps } from 'react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      {...props}
    >
      <path d="M18.8 3.2a2.4 2.4 0 0 0-3.39 0L12 6.59l-3.41-3.4a2.4 2.4 0 0 0-3.4 0L2.34 5.95a2.4 2.4 0 0 0 0 3.4L5.75 12l-3.41 3.4a2.4 2.4 0 0 0 0 3.4L5.2 21.66a2.4 2.4 0 0 0 3.4 0L12 18.25l3.41 3.41a2.4 2.4 0 0 0 3.4 0l2.85-2.85a2.4 2.4 0 0 0 0-3.4L18.25 12l3.4-3.41a2.4 2.4 0 0 0 0-3.4Z" />
      <path d="m12 8.5 3.5 3.5-3.5 3.5" />
      <path d="m8.5 12 H 12" />
    </svg>
  );
}
