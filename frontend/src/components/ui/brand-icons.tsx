import * as React from "react";

type P = React.SVGProps<SVGSVGElement>;

export function Facebook(props: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" {...props}>
      <path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.6V3.4C16.4 3.3 15.5 3.2 14.4 3.2c-2.3 0-3.9 1.4-3.9 4v2.6H7.8V13h2.7v8h3z" />
    </svg>
  );
}

export function Instagram(props: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" />
    </svg>
  );
}
