interface Props {
  onClick?: () => void;
}

export function Brand({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center"
      aria-label="AlgorithmX, לדף הראשון"
      style={{
        background: 'none',
        border: 0,
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        minHeight: 44,
        paddingInline: 2,
      }}
    >
      <span
        className="text-[1.15rem] leading-none sm:text-[1.35rem]"
        style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 600, letterSpacing: '-0.02em', direction: 'ltr' }}
      >
        {/*
          * On a narrow bar the wordmark drops to its initial. The row never
          * wraps, so the space it was holding was coming out of the algorithm's
          * name, which is the one label in the bar that has to be readable.
          */}
        <span className="hidden sm:inline" style={{ color: 'var(--ink)' }}>
          Algorithm
        </span>
        <span style={{ color: 'var(--accent)' }}>X</span>
      </span>
    </button>
  );
}
