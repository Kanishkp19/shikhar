"use client";

interface DiagramProps {
  type?: string;
  width?: number;
  height?: number;
}

export function HandwrittenDiagram({ type, width = 160, height = 110 }: DiagramProps) {
  if (!type || type === "none") return null;

  switch (type) {
    case "triangle_basic":
      return (
        <svg width={width} height={height} viewBox="0 0 160 110" className="select-none">
          {/* Main Triangle ABC */}
          <polygon
            points="80,15 20,95 140,95"
            fill="rgba(79, 70, 229, 0.03)"
            stroke="#2d3748"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Angle arcs */}
          <path d="M 72 27 A 10 10 0 0 0 88 27" fill="none" stroke="#dc2626" strokeWidth="1.5" />
          <path d="M 33 87 A 12 12 0 0 0 35 95" fill="none" stroke="#2563eb" strokeWidth="1.5" />
          <path d="M 125 95 A 12 12 0 0 0 127 87" fill="none" stroke="#16a34a" strokeWidth="1.5" />

          {/* Labels */}
          <text x="80" y="10" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">A</text>
          <text x="10" y="100" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">B</text>
          <text x="150" y="100" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">C</text>

          {/* Side labels */}
          <text x="44" y="52" textAnchor="middle" fontSize="12" fontFamily="var(--font-caveat), cursive" fill="#4b5563">c</text>
          <text x="116" y="52" textAnchor="middle" fontSize="12" fontFamily="var(--font-caveat), cursive" fill="#4b5563">b</text>
          <text x="80" y="106" textAnchor="middle" fontSize="12" fontFamily="var(--font-caveat), cursive" fill="#4b5563">a</text>
          <text x="80" y="38" textAnchor="middle" fontSize="11" fontFamily="var(--font-caveat), cursive" fill="#dc2626">∠A</text>
        </svg>
      );

    case "triangle_exterior":
      return (
        <svg width={width} height={height} viewBox="0 0 160 110" className="select-none">
          {/* Base extension line */}
          <line x1="20" y1="90" x2="150" y2="90" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Triangle ABC */}
          <polygon
            points="75,20 30,90 110,90"
            fill="rgba(124, 58, 237, 0.05)"
            stroke="#2d3748"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Shaded top angle */}
          <path d="M 68 30 A 10 10 0 0 0 82 30" fill="#c084fc" opacity="0.6" stroke="#7e22ce" strokeWidth="1" />
          {/* Exterior Angle Arc */}
          <path d="M 110 90 A 20 20 0 0 0 128 76" fill="none" stroke="#d97706" strokeWidth="2" />

          {/* Labels */}
          <text x="75" y="14" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">A</text>
          <text x="20" y="96" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">B</text>
          <text x="108" y="102" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">C</text>
          <text x="150" y="102" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">D</text>
          <text x="126" y="72" textAnchor="start" fontSize="12" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#d97706">∠ex</text>
        </svg>
      );

    case "pythagoras":
      return (
        <svg width={width} height={height} viewBox="0 0 160 110" className="select-none">
          {/* Right triangle */}
          <polygon
            points="35,15 35,90 125,90"
            fill="rgba(16, 185, 129, 0.04)"
            stroke="#2d3748"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Right angle box */}
          <rect x="35" y="78" width="12" height="12" fill="none" stroke="#059669" strokeWidth="1.5" />

          {/* Labels */}
          <text x="35" y="10" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">A</text>
          <text x="23" y="96" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">B</text>
          <text x="135" y="96" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">C</text>

          <text x="25" y="55" textAnchor="end" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#2563eb">a</text>
          <text x="80" y="105" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#2563eb">b</text>
          <text x="86" y="48" textAnchor="start" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#dc2626">c</text>
        </svg>
      );

    case "bisector":
      return (
        <svg width={width} height={height} viewBox="0 0 160 110" className="select-none">
          <polygon
            points="80,15 25,95 135,95"
            fill="none"
            stroke="#2d3748"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Bisector line AD */}
          <line x1="80" y1="15" x2="80" y2="95" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />

          {/* Angle arcs */}
          <path d="M 72 28 A 12 12 0 0 0 80 28" fill="none" stroke="#dc2626" strokeWidth="1" />
          <path d="M 80 28 A 12 12 0 0 0 88 28" fill="none" stroke="#dc2626" strokeWidth="1" />

          {/* Labels */}
          <text x="80" y="10" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">A</text>
          <text x="15" y="100" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">B</text>
          <text x="80" y="108" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#dc2626">D</text>
          <text x="145" y="100" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">C</text>
        </svg>
      );

    case "proportionality":
      return (
        <svg width={width} height={height} viewBox="0 0 160 110" className="select-none">
          <polygon
            points="80,15 20,95 140,95"
            fill="none"
            stroke="#2d3748"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Parallel line DE */}
          <line x1="42" y1="65" x2="118" y2="65" stroke="#2563eb" strokeWidth="2" />

          {/* Parallel arrows */}
          <path d="M 76 61 L 82 65 L 76 69" fill="none" stroke="#2563eb" strokeWidth="1.5" />
          <path d="M 76 91 L 82 95 L 76 99" fill="none" stroke="#2d3748" strokeWidth="1.5" />

          {/* Labels */}
          <text x="80" y="10" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">A</text>
          <text x="32" y="65" textAnchor="end" fontSize="12" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#2563eb">D</text>
          <text x="128" y="65" textAnchor="start" fontSize="12" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#2563eb">E</text>
          <text x="12" y="100" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">B</text>
          <text x="148" y="100" textAnchor="middle" fontSize="13" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#1e1b4b">C</text>
        </svg>
      );

    case "circle":
      return (
        <svg width={width} height={height} viewBox="0 0 160 110" className="select-none">
          <circle cx="80" cy="55" r="40" fill="rgba(14, 165, 233, 0.04)" stroke="#2d3748" strokeWidth="2" />
          <circle cx="80" cy="55" r="3" fill="#dc2626" />
          <line x1="80" y1="55" x2="115" y2="35" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x="96" y="40" fontSize="12" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#0284c7">r</text>
          <text x="74" y="68" fontSize="12" fontFamily="var(--font-caveat), cursive" fontWeight="bold" fill="#dc2626">O</text>
        </svg>
      );

    case "coordinate":
      return (
        <svg width={width} height={height} viewBox="0 0 160 110" className="select-none">
          <line x1="15" y1="55" x2="145" y2="55" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="80" y1="10" x2="80" y2="100" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="30" y1="85" x2="130" y2="25" stroke="#2563eb" strokeWidth="2" />
          <text x="145" y="50" fontSize="11" fontFamily="var(--font-caveat), cursive" fill="#4b5563">X</text>
          <text x="85" y="18" fontSize="11" fontFamily="var(--font-caveat), cursive" fill="#4b5563">Y</text>
        </svg>
      );

    default:
      return null;
  }
}
