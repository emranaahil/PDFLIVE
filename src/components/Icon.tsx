type Props = { name: string; className?: string };

const svg = "h-4 w-4 shrink-0";

export function Icon({ name, className = svg }: Props) {
  const p = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "brand":
      return (
        <svg {...p}>
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      );
    case "select":
      return (
        <svg {...p}>
          <path d="M4 4l7 16 2.2-6.2L20 11z" />
        </svg>
      );
    case "text":
      return (
        <svg {...p}>
          <path d="M5 6V4h14v2M12 4v16M8 20h8" />
        </svg>
      );
    case "hide":
      return (
        <svg {...p}>
          <path d="M4 7h16v10H4z" />
          <path d="M7 12h10" />
        </svg>
      );
    case "sign":
      return (
        <svg {...p}>
          <path d="M4 19c4-8 6-4 9-9 2 3 3 6 7 6" />
        </svg>
      );
    case "pages":
      return (
        <svg {...p}>
          <path d="M7 4h8l4 4v12H7z" />
          <path d="M15 4v4h4M5 8v12h10" />
        </svg>
      );
    case "rotate":
      return (
        <svg {...p}>
          <path d="M20 12a8 8 0 1 1-2.2-5.5" />
          <path d="M20 4v6h-6" />
        </svg>
      );
    case "compress":
      return (
        <svg {...p}>
          <path d="M8 4h8v4H8zM6 10h12v4H6zM4 16h16v4H4z" />
        </svg>
      );
    case "bw":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16" />
        </svg>
      );
    case "merge":
      return (
        <svg {...p}>
          <path d="M8 6H4v12h4M16 6h4v12h-4M10 12h4M12 9v6" />
        </svg>
      );
    case "protect":
      return (
        <svg {...p}>
          <path d="M7 11V8a5 5 0 0 1 10 0v3" />
          <path d="M6 11h12v9H6z" />
        </svg>
      );
    case "unlock":
      return (
        <svg {...p}>
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          <path d="M6 11h12v9H6z" />
        </svg>
      );
    case "undo":
      return (
        <svg {...p}>
          <path d="M4 8h8" />
          <path d="M4 8l4-4M4 8l4 4" />
          <path d="M12 8a7 7 0 1 1-2 5" />
        </svg>
      );
    case "redo":
      return (
        <svg {...p}>
          <path d="M20 8H12" />
          <path d="M20 8l-4-4M20 8l-4 4" />
          <path d="M12 8a7 7 0 1 0 2 5" />
        </svg>
      );
    case "download":
      return (
        <svg {...p}>
          <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
        </svg>
      );
    case "more":
      return (
        <svg {...p}>
          <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "zoom-in":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-3.5-3.5M11 8v6M8 11h6" />
        </svg>
      );
    case "zoom-out":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-3.5-3.5M8 11h6" />
        </svg>
      );
    case "fit-width":
      return (
        <svg {...p}>
          <path d="M4 8v8M20 8v8M8 12h8M8 9l-3 3 3 3M16 9l3 3-3 3" />
        </svg>
      );
    case "fit-page":
      return (
        <svg {...p}>
          <path d="M7 4h10v16H7z" />
        </svg>
      );
    case "prev":
      return (
        <svg {...p}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      );
    case "next":
      return (
        <svg {...p}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "rail":
      return (
        <svg {...p}>
          <path d="M4 6h16M4 12h10M4 18h16" />
        </svg>
      );
    case "thumbs":
      return (
        <svg {...p}>
          <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />
        </svg>
      );
    case "close":
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "apply":
      return (
        <svg {...p}>
          <path d="M5 12l5 5 9-10" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
