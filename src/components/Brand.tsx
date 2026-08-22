interface Props {
  onClick?: () => void;
}

export function Brand({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="hidden items-center sm:flex"
      aria-label="AlgorithmX, לדף הראשון"
      style={{
        background: 'none',
        border: 0,
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        minHeight: 'var(--tap)',
        // The mark shrinks to one letter on a narrow bar, the tap target does not
        minWidth: 'var(--tap)',
        justifyContent: 'center',
        paddingInline: 2,
      }}
    >
      <span
        className="text-[1.15rem] leading-none sm:text-[1.35rem]"
        style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 600, letterSpacing: '-0.02em', direction: 'ltr' }}
      >
        {/*
          * The whole wordmark steps aside on a narrow bar. The row never wraps,
          * and the space it held was coming out of the algorithm's name, which
          * is the one label here that has to stay readable. The switcher beside
          * it reaches every page the mark linked to.
          */}
        <span style={{ color: 'var(--ink)' }}>Algorithm</span>
        <span style={{ color: 'var(--accent)' }}>X</span>
      </span>
    </button>
  );
}
