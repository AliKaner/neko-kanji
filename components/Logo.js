export default function Logo({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label="Neko Kanji"
      style={{ flexShrink: 0 }}
    >
      <rect width="100" height="100" rx="22" fill="var(--accent)" />
      <path d="M25 34 L32 12 L46 27 Z" fill="#fff" />
      <path d="M75 34 L68 12 L54 27 Z" fill="#fff" />
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <line x1="7" y1="52" x2="21" y2="55" />
        <line x1="7" y1="65" x2="21" y2="62" />
        <line x1="93" y1="52" x2="79" y2="55" />
        <line x1="93" y1="65" x2="79" y2="62" />
      </g>
      <text
        x="50"
        y="74"
        fontSize="54"
        textAnchor="middle"
        fill="#fff"
        fontWeight="700"
        fontFamily="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif"
      >
        猫
      </text>
    </svg>
  );
}
