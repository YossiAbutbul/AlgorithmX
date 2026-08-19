const REPO_URL = 'https://github.com/YossiAbutbul/AlgorithmX';
const OWNER = 'YossiAbutbul';
const YEAR = 2026;

/** GitHub mark. lucide dropped brand icons, so it is drawn inline here. */
function GithubMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="flex w-full items-center justify-between gap-2 px-4 py-1 sm:py-0.5 text-[12px] leading-none">
        <span className="flex items-baseline gap-2 whitespace-nowrap text-[12px] leading-none">
          <span
            className="tracking-tight"
            style={{ fontFamily: "'Secular One', sans-serif", direction: 'ltr' }}
          >
            <span style={{ color: 'var(--ink)' }}>Algorithm</span>
            <span style={{ color: 'var(--accent)' }}>X</span>
          </span>
          <span className="num text-ink-soft" dir="ltr">
            © {YEAR}
            {/* The owner name is already in the link, so it drops on narrow screens */}
            <span className="hidden sm:inline"> {OWNER}</span>
          </span>
        </span>

        <a
          className="footer-link whitespace-nowrap"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${OWNER}/AlgorithmX on GitHub`}
        >
          <GithubMark />
          <span className="num hidden sm:inline" dir="ltr">
            {OWNER}/AlgorithmX
          </span>
        </a>
      </div>
    </footer>
  );
}
