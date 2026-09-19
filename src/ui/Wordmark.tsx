const CLIP_TEXT = {
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as const;

type Props = {
  /** On the cream sheet (dark letters) rather than the night sky (white letters). */
  onLight: boolean;
};

/**
 * The "Miiiwa." logotype — just the letters, so the hub's button and the
 * reading pages' link can both wrap it. The three i-stems and the full stop
 * blink through the sequence in globals.css.
 */
export default function Wordmark({ onLight }: Props) {
  return (
    <>
      <span>M</span>
      <span
        className={`bg-clip-text text-transparent ${onLight ? "stem-split-light-1 anim-light-d1" : "stem-split-dark-1 anim-dark-d1"}`}
        style={CLIP_TEXT}
      >
        i
      </span>
      <span
        className={`bg-clip-text text-transparent ${onLight ? "stem-split-light-2 anim-light-d2" : "stem-split-dark-2 anim-dark-d2"}`}
        style={CLIP_TEXT}
      >
        i
      </span>
      <span
        className={`bg-clip-text text-transparent ${onLight ? "stem-split-light-3 anim-light-d3" : "stem-split-dark-3 anim-dark-d3"}`}
        style={CLIP_TEXT}
      >
        i
      </span>
      <span>wa</span>
      <span className={onLight ? "anim-light-d4" : "anim-dark-d4"}>.</span>
    </>
  );
}
