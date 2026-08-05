"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/state/LanguageContext";
import { motion } from "framer-motion";
import { sceneClock } from "@/scene/sceneClock";
import {
  aboutReturn,
  aboutReturnProgress,
  aboutScrollProgress,
  autoScrollStep,
  scrollCatchUp,
  settleRetryDelay,
  shouldReturnHome,
  wheelScrollStep,
} from "./aboutScroll";

/**
 * The About column: text straight over the diorama, with no card and no sheet,
 * scrolled like the Star Wars opening crawl — tilted back in 3D so each line
 * enters upright from the bottom of the screen and recedes away from the
 * reader as it climbs, rather than sliding up the screen flat.
 *
 * The only area you leave by finishing it. Every other section is a full-screen
 * panel bracketed by transparent spacers, and scrolling off either one returns;
 * here the column itself is the scroller, and reaching the bottom of the
 * writing is what goes home. That replaced a HOME button — a control that had
 * to be noticed and aimed at, sitting over a page whose whole premise is that
 * you get around by moving through it.
 *
 * The tilt (`rotateX`, anchored at the bottom edge of the viewport so the
 * pivot stays put while the content scrolls past it) does the work a real
 * crawl gets from its camera: text is full size and flat-on right where it
 * enters at the bottom, and shrinks toward the vanishing point as it climbs.
 * The bottom has no mask at all — a line does not fade in, it is simply
 * there the moment it scrolls into the box. The top carries a short one (the
 * last 12% of the column), but only as a finishing touch on top of the
 * shrink, not as the thing doing the disappearing: a perspective distance
 * steep enough to shrink a line to nothing on its own, unmasked, also
 * distorted the wide, near lines it shares a transform with, so the shrink
 * is tuned gentle enough to stay undistorted and the mask only ever catches
 * content it has already taken most of the way down. Nothing is visible for
 * a beat at the very start: a short leading spacer sits before the heading,
 * so the box opens empty and the first line only climbs into it once the
 * column has advanced past that spacer — sized against the auto-play speed
 * below, not against the viewport, since the spacer is a pause to hold on
 * and not a distance to hide. It advances on its own — a real crawl runs
 * without a hand on the wheel, and this one plays the same way; scrolling
 * only speeds it up or backs it up, it is never required to make it move at
 * all. The perspective container has to be a separate element from the
 * scrolling one:
 * framer-motion owns the `transform` property on whichever element carries
 * its `x`/`opacity` entrance animation, and would overwrite a CSS `rotateX`
 * set on that same element every frame it animates.
 *
 * The copy below is placeholder standing in for the real thing: it is drawn
 * from the dates and projects in Experience so that it reads truthfully and is
 * long enough for the scrolling to have something to do, but it is written to
 * be replaced.
 */

type Props = {
  /** Called once the column has been read to the end. */
  onFinish: () => void;
};

export default function About({ onFinish }: Props) {
  const { language } = useLanguage();
  const isJa = language === "ja";

  const openedAt = useRef(0);
  const finished = useRef(false);
  const columnRef = useRef<HTMLDivElement | null>(null);
  // The prose block, not the scroller: the scroller carries no line-height of
  // its own (it would report `normal`), and the pace is measured in lines.
  const proseRef = useRef<HTMLDivElement | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Where the column is heading. The wheel and the auto-play both write here
   * and the frame loop walks `scrollTop` towards it — see `scrollCatchUp` for
   * why the camera makes that indirection worth having.
   *
   * Authoritative, not a shadow of `scrollTop`: the wheel is `preventDefault`ed
   * and there is no other way to scroll this box, so nothing else moves it.
   */
  const scrollTargetRef = useRef(0);

  /**
   * The column's own measurements — the three numbers every frame needs, none
   * of which change while it is being read.
   *
   * Cached rather than measured per frame. Reading `getComputedStyle` and
   * `offsetHeight` and then writing `scrollTop` is a read/write/read against
   * layout, and this loop runs for the whole time the reader is also flying the
   * camera home; the browser was being made to flush layout twice a frame for
   * numbers that only move when the column is laid out again.
   */
  const metricsRef = useRef({ lineHeight: 0, proseBottom: 0, maxScroll: 0 });

  /** Keeps a scroll target inside the column, the way `scrollTop` keeps itself. */
  const clampScroll = (value: number) => Math.max(0, Math.min(metricsRef.current.maxScroll, value));

  useEffect(() => {
    const column = columnRef.current;
    const prose = proseRef.current;
    if (!column || !prose) return;
    const measure = () => {
      metricsRef.current = {
        // The scroller carries no line-height of its own — it would report
        // `normal` — so this is the prose block's, which is also the one number
        // that already tracks the type size at every viewport width.
        lineHeight: parseFloat(getComputedStyle(prose).lineHeight),
        // A fixed document-space pixel: where the last line sits before any
        // scrolling (see `aboutScrollProgress`).
        proseBottom: prose.offsetTop + prose.offsetHeight,
        maxScroll: Math.max(0, column.scrollHeight - column.clientHeight),
      };
    };
    measure();
    // Both boxes: the prose changes height when the copy rewraps, and the
    // column's `clientHeight` changes when the window does.
    const observer = new ResizeObserver(measure);
    observer.observe(prose);
    observer.observe(column);
    return () => observer.disconnect();
    // The copy itself changes with the language, which moves `offsetTop` even
    // where it does not change any box's size.
  }, [isJa]);

  // The camera starts where the column does. Published on the way in as well
  // as on the way out, so a column reopened after being read to the end never
  // hands the scene a leftover 1 and drops it straight home.
  useEffect(() => {
    openedAt.current = Date.now();
    aboutReturn.publish(0);
    return () => {
      aboutReturn.publish(0);
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    };
  }, []);

  // Wheels over the column scroll it, at half the browser's pace, and do
  // nothing else.
  //
  // `stopPropagation` because the scene listens on `window` to orbit the
  // diorama, so without it the same gesture would both read the text and spin
  // the town underneath it. `preventDefault` — which this deliberately did not
  // do while the browser's own scrolling was wanted — because the column is
  // now driven from here: at the browser's rate one flick of a trackpad
  // crossed most of the writing and took the camera home with it.
  //
  // Not passive, therefore. What is given up is the browser's own animation of
  // a discrete mouse notch; a trackpad, which sends a stream of small deltas,
  // is as smooth as it was and simply travels less far.
  useEffect(() => {
    const element = columnRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.stopPropagation();
      event.preventDefault();
      // The *target*, not the column itself — the loop below walks it there
      // over a few frames (see `scrollCatchUp` for why the camera makes that
      // necessary). Clamped here because `scrollTarget` is a number of our own
      // rather than `scrollTop`, which clamps itself: without it an overscroll
      // at either end would bank travel that has to be scrolled back out of.
      //
      // `window.innerHeight`, not `element.clientHeight`: the column's own
      // box is taller than the viewport now (see the scroller's `h-[350%]`
      // below), so its `clientHeight` no longer means "one screen" — a
      // `deltaMode === 2` (page-unit) wheel event needs the actual viewport.
      const step = wheelScrollStep(event.deltaY, event.deltaMode, window.innerHeight);
      scrollTargetRef.current = clampScroll(scrollTargetRef.current + step);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  // Plays the column on its own — a real crawl runs with nobody's hand on
  // it, and the wheel above is an accelerator for an impatient reader, not
  // the only way to move.
  //
  // A plain `requestAnimationFrame` loop, not `useFrame`: this column is a
  // DOM overlay outside the R3F canvas, so there is no frame callback to
  // hook here. It still reads time through `sceneClock` rather than its own
  // raw delta, so the site's pause button freezes this too, the same as
  // every other thing in the scene that moves on its own (see CLAUDE.md).
  // `lastTime` starts null and the first frame only records it — same
  // reasoning as not adding `delta` on a flight's first frame in
  // `Scene.tsx`: there is no prior frame yet to measure a step against.
  //
  // Two clocks, deliberately. The auto-play runs on the diorama's, so the
  // pause button stops the crawl with everything else; the catch-up runs on
  // real time, so a wheel turned while paused still arrives somewhere.
  useEffect(() => {
    let frameId: number;
    let lastTime: number | null = null;
    const tick = (now: number) => {
      const element = columnRef.current;
      if (element && lastTime !== null) {
        const realDeltaSeconds = (now - lastTime) / 1000;
        // The pace is a rate in *lines* (see ABOUT_AUTO_SCROLL_LINES_PER_SECOND),
        // so the prose block's own computed line height is what converts it to
        // pixels — cached rather than read here, since it only changes when the
        // column is laid out again (see `metricsRef`).
        const auto = autoScrollStep(sceneClock.delta(realDeltaSeconds), metricsRef.current.lineHeight);
        if (auto > 0) scrollTargetRef.current = clampScroll(scrollTargetRef.current + auto);

        const catchUp = scrollCatchUp(element.scrollTop, scrollTargetRef.current, realDeltaSeconds);
        // Sub-pixel steps are rounded away by `scrollTop` anyway; skipping them
        // keeps a settled column from writing to it sixty times a second.
        if (Math.abs(catchUp) >= 0.01) element.scrollTop += catchUp;
      }
      lastTime = now;
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (finished.current) return;
    const el = event.currentTarget;
    const progress = aboutScrollProgress(el.scrollTop, metricsRef.current.proseBottom);
    // Before the finish check, not after: the event that ends the column is
    // also the one that has to leave the camera home, and returning early
    // would strand it a hair short of the home framing for the scene to then
    // be told the trip was over.
    aboutReturn.publish(aboutReturnProgress(progress));

    const age = Date.now() - openedAt.current;
    if (shouldReturnHome(progress, age)) {
      finish();
      return;
    }

    // A flick hard enough to reach the bottom during the entrance is refused,
    // and there is nothing left to scroll that would ask again. Re-read the
    // column when the window closes rather than trusting this position: a
    // reader who has scrolled back up since has fired events of their own,
    // and those have already cleared this timer.
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    const retry = settleRetryDelay(progress, age);
    if (retry > 0) {
      settleTimer.current = setTimeout(() => {
        const column = columnRef.current;
        if (!column) return;
        const now = aboutScrollProgress(column.scrollTop, metricsRef.current.proseBottom);
        aboutReturn.publish(aboutReturnProgress(now));
        if (shouldReturnHome(now, Date.now() - openedAt.current)) finish();
      }, retry);
    }
  };

  // The Japanese copy is written entirely in full-width forms — `２０１９`, not
  // `2019` — because the crawl is set on a grid of one em per character (see
  // the prose block below). Each paragraph also has to stay on a single source
  // line: JSX condenses a newline in the middle of a text run into a single
  // half-width space, which is narrower than a cell and knocks that one line
  // off the grid. `aboutCopy.test.ts` holds both rules — neither depends on
  // how many cells wide the block is, so changing that is not a reason to
  // revisit them.
  const paragraphs = isJa
    ? [
        <>
          初めまして、<span className="font-bold">Ｍｉｉｉｗａ</span>です。「面白いを最優先！」をモットーに、日々新しい技術に触れながらプロダクト開発に挑戦している駆け出しの学生エンジニア（２７卒）です。
        </>,
        <>
          きっかけは２０１９年、漫画『王様達のヴァイキング』を読んだことでした。コード一つで世界と対峙できるという事実に衝撃を受け、そこからコンピュータの世界にのめり込んでいます。翌年には情報系の高校へ進学し、Ｃ言語でアルゴリズムやメモリ管理といった土台を固めました。
        </>,
        <>
          転機になったのはＰｙｔｈｏｎとの出会いです。思いついたものがその日のうちに動く——この速度を知ってから、作りたいものの数が一気に増えました。２０２４年にはエンジニア養成機関「４２ｔｏｋｙｏ」へ入学し、ピアラーニングの環境で自走力とソフトウェアエンジニアリングを鍛え直しています。
        </>,
        <>
          ２０２５年には東京大学松尾研究室のＧＣＩ（グローバル消費インテリジェンス寄付講座）を修了し、データサイエンスとＡＩの視点を手に入れました。同じ年、産学連携プロジェクトではリーダーとしてチーム開発を牽引し、実社会の課題に向き合う難しさと面白さを知りました。
        </>,
        <>
          個人開発では「ｉｍａｄｏｋｏ」から始まり、Ｐ２Ｐスペースシェアリングの「Ｓｕｋｉｍａ　Ｐａｒｋ」、「ｍｅｓｅｎ」と作り続け、いまは新サービス「Ｕｍｏｊａ」を開発中です。要件定義からアーキテクチャ設計、実装までを一人で回すなかで、技術は目的ではなく手段だと考えるようになりました。
        </>,
        <>
          大切にしているのは、ただ動くものを作らないこと。「使ってて楽しい」「デザインがカッコいい」と思ってもらえる体験（ＵＸ）まで含めて、はじめてプロダクトだと思っています。このポートフォリオをボクセルの街にしたのも、その答えの一つです。
        </>,
        <>
          とにかく新規性重視で、まだこの世にないものを探し求めて、日々を過ごしています！
        </>,
      ]
    : [
        <>
          Hello, I&apos;m <span className="font-bold">Miiiwa</span> — a junior
          student engineer (Class of &apos;27) challenging product development
          every day with the motto &quot;Fun First!&quot;
        </>,
        <>
          It started in 2019, with a manga called <em>Kings&apos; Viking</em>. The
          idea that a single piece of code could take on the world floored me,
          and I have been buried in computers ever since. The next year I entered
          an IT-focused high school and laid the groundwork in C — algorithms,
          memory, how the machine actually works.
        </>,
        <>
          Python was the turning point. An idea could run the same day I had it,
          and once I knew that speed the list of things I wanted to build got a
          lot longer. In 2024 I joined 42tokyo, where peer learning rebuilt how I
          work on my own and how I think about software engineering.
        </>,
        <>
          In 2025 I completed GCI (Global Consumer Intelligence) at the
          University of Tokyo&apos;s Matsuo Lab, which gave me a data science and
          AI perspective. That same year I led a joint industry-academia project,
          and learned how hard — and how interesting — real-world problems are.
        </>,
        <>
          On my own I have shipped <em>imadoko</em>, then <em>Sukima Park</em>, a
          P2P space-sharing platform, then <em>mesen</em>; right now I am building
          a new service called <em>Umoja</em>. Running everything myself, from
          requirements through architecture to implementation, is what taught me
          that technology is the means and never the point.
        </>,
        <>
          What I care about is not stopping at something that merely works. A
          product is only a product once the experience around it — &quot;this is
          fun to use&quot;, &quot;the design is cool&quot; — is there too. Making
          this portfolio a voxel town is one answer to that.
        </>,
        <>
          Above all I chase novelty, spending my days looking for the things that
          do not exist yet.
        </>,
      ];

  return (
    <motion.div
      // No card chrome — this sits directly over the diorama.
      //
      // `perspective` lives on this outer, non-scrolling shell rather than on
      // the scroller itself: it has to be a plain ancestor of the tilted
      // element for the 3D projection to apply, and putting it on the same
      // node that framer-motion animates (`x`/`opacity` below) would be fine
      // on its own — `perspective` isn't part of `transform` — but the
      // `rotateX` tilt does need to live somewhere framer-motion never writes
      // to, which is the inner div.
      // In and out through the bottom edge, the direction the crawl itself
      // travels — it used to slide in from the left, across the reading
      // direction, which read as a panel arriving rather than as text rising
      // out of the frame. Paired with the full-height leading spacer below,
      // which is what puts the first line *at* the bottom edge to begin with.
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ duration: 0.5 }}
      // The whole frame, no width cap. `perspective-origin`'s X therefore
      // lands on the frame's own centre line, which is what `image9.jpg` is
      // symmetrical about — and, more practically, the axis the projection
      // fans out from. A capped column pushed off to one side put every near
      // line far from that axis, and the fan turned "large" into "stretched"
      // (the complaint the previous pass answered by shrinking the angle,
      // which cost the drama without fixing the cause).
      // Three quarters of the frame, sat left of the planet — which the "near"
      // orbit parks at the bottom-right (see NEAR_VERTICAL_SHARE). The margin
      // is what it is because the *width* was the thing being changed: this
      // keeps the column's centre where it already was (a third of the way
      // across) so narrowing it pulls both edges in evenly rather than
      // sliding the text sideways. The small negative still lets the widest
      // lines clip the left edge, which is `image9.jpg`'s "nearest line runs
      // off the frame" — the right edge is left alone, since that is where
      // the planet is.
      //
      // Any overhang has to be on *this* box rather than on the text inside
      // the scroller. `overflow-y: auto` forces `overflow-x` to compute to
      // `auto` as well, so a child wider than the scroller is clipped in the
      // scroller's own local space — before the perspective — which cut every
      // line at the same two local x's and so truncated the far lines just as
      // hard as the near ones. Overflowing the viewport instead lets the
      // frame do the cutting.
      //
      // Being off-centre is safe. An earlier note here claimed the frame's
      // centre line was what kept the near lines from fanning out — it was
      // not. Cropped screenshots taken after centring but *before* the
      // perspective was eased still showed the same skew; what actually fixed
      // it was `perspective` going 160px → 420px (see the scroller below).
      className="relative pointer-events-none w-[75%] -ml-[2%] h-full [perspective:460px] [perspective-origin:50%_15%]"
    >
      <div
        ref={columnRef}
        // Marks this as a real control, so the scene's drag handler leaves the
        // gesture alone instead of orbiting the diorama behind the text.
        data-ui
        onScroll={handleScroll}
        // The crawl tilt. Anchored at the *bottom* of this div's own box —
        // not the content's — so the pivot is the bottom edge of the
        // viewport itself and stays there as the content scrolls past it;
        // anchoring by percentage on the scrolled content (which is many
        // screens tall) would put the pivot somewhere off past the last
        // paragraph instead. Lines are flat-on and full size right where
        // they enter at the bottom, and recede — smaller, more tilted away —
        // the further up the screen they climb.
        //
        // The box itself is `h-[350%]` — 3.5 screens tall, not one — sized
        // against reference/image10.png: a horizontal line drawn on that
        // screenshot marking how much farther up the crawl should still be
        // legible lands, worked backward through this same projection, at a
        // box 3.4-3.5x the viewport. `absolute inset-x-0 bottom-0` on this
        // element (paired with `relative` on the perspective parent above)
        // is what lets it grow upward off past the header instead of
        // downward off the bottom of the screen — plain flow would have
        // grown it the wrong direction, since `transform-origin: 50% 100%`
        // pins the pivot to *this* box's own bottom edge regardless of
        // where that edge ends up. The extra height only changes how much
        // of the document is visible in one frame; everything already on
        // screen at the old height is unaffected; see the mask comment
        // below for the one thing that does scale with it.
        //
        // No mask at the bottom, on purpose — a line does not fade in, it is
        // simply there, full size, the moment it scrolls into the box. The
        // top is different, and went through two wrong answers before this
        // one:
        //
        // 1. No mask at all, shrink doing 100% of the work. To make that
        //    shrink actually reach "gone" before a line crossed local y 0
        //    and the overflow clip removed it outright, the perspective
        //    distance had to come down to ~50px — but that steep a funnel
        //    distorts wide, centered lines near the bottom too (the same
        //    curvature that makes the vanishing point sharp also fans out
        //    the near lines' left and right ends), and against the doubled
        //    column width that read as stretched and unreadable rather than
        //    dramatic.
        // 2. A wide mask (the first version of this file, ~34% of the
        //    column). That kept perspective gentle enough to stay readable,
        //    but faded text that was still large and legible — a visible
        //    dissolve, not a line vanishing into distance.
        //
        // This is the middle: perspective gentle enough (460px) that no line
        // anywhere in the readable band is distorted, plus a short mask
        // (`black_20%` below) that only ever touches content the shrink has
        // *already* taken most of the way — by the time a line reaches that
        // band it is a small fraction of reading size, so the fade reads as
        // the last bit of "too far to see" rather than as its own effect.
        //
        // The mask percentage is measured against the *box's* own height,
        // not the screen, so it had to move when the box did (`h-full` →
        // `h-[350%]`, above): the same 12% that used to buy a ~17px fade at
        // the top of the frame would buy only ~9px of the new, taller box —
        // a hard edge rather than a fade, since the top of the box is now
        // deep enough into the funnel that a few percent already spans very
        // little screen space. 20% reproduces that same ~17px screen-space
        // fade width against the new box height (worked out from this
        // element's own transform, not eyeballed) — the topmost sliver
        // stays exactly as wide on screen as it was before, just relocated
        // to the new, higher vanishing point.
        //
        // Yellow (`#FFE81F`) and bold, and sized to fill the frame near the
        // pivot rather than sit at reading size — reference/image8.png (a
        // screenshot marked up with the funnel this was built to match) and
        // reference/image9.jpg (an actual frame of the film, where the
        // nearest line is cut off by both the bottom and side of the frame)
        // are both scaled far larger than body text anywhere else on the
        // site.
        className="pointer-events-auto absolute inset-x-0 bottom-0 w-full h-[350%] overflow-y-auto text-[#FFE81F] font-bold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [transform:rotateX(110deg)] [transform-origin:50%_100%] [mask-image:linear-gradient(to_bottom,transparent,black_20%)]"
      >
        {/*
         * Leading space exactly one scroller tall, which is what makes the
         * first line arrive **at the bottom edge of the frame** rather than
         * already halfway up it.
         *
         * "One scroller tall" — not one screen tall, now that the scroller
         * is `h-[350%]` — but `h-full` on this child still means exactly
         * that: 100% of the scroller's own (taller) height, so it keeps
         * tracking the scroller automatically if that height changes again.
         *
         * The scroller shows document `[scrollTop, scrollTop + clientHeight]`
         * mapped onto the tilted plane, with the *bottom* of that band on the
         * pivot (full size) and the top at the vanishing point. So at
         * `scrollTop = 0` a spacer of `h-full` puts the heading precisely on
         * the pivot: it enters from below and climbs, which is the whole
         * shape of a crawl.
         *
         * This was `h-[8%]` for a while, and the reasoning recorded for that
         * was wrong: the complaint it answered was that the heading "took a
         * minute to appear", but the heading was never hidden — it was on the
         * bottom edge the whole time, and what took a minute was its climb to
         * somewhere comfortably readable, at 14px/s. The pace is a rate in
         * lines now (`ABOUT_AUTO_SCROLL_LINES_PER_SECOND`), roughly 70px/s at
         * a desktop breakpoint, so that same climb is about six seconds and
         * the full-height spacer costs nothing.
         */}
        <div aria-hidden className="h-full" />

        {/* Clear of the header. Padding rather than a margin on the scroller,
            so it scrolls away with the text instead of holding a permanent
            gap the writing can never use. Sizes are large enough to wrap
            after a handful of characters — reference/image9.jpg (an actual
            frame of the film) is the target: text near the pivot dominates
            the frame, not a paragraph sized for reading comfort.

            Centered, not left-aligned — this is what left-aligned text was
            doing to the "stretched, unreadable" complaint: `rotateX` and
            `perspective-origin` are both centered on the column's own
            width, so they shrink every line's X offset toward that center
            line. Left-aligned text sits far to the left of it, so each
            line's start crept rightward toward center by a different amount
            depending on its own depth, and consecutive lines drifted out of
            alignment with each other — reading as warped rather than just
            smaller. Centered text has no such offset: a line's own middle
            already sits on the axis everything shrinks toward, so it only
            gets smaller, never skewed.

            The body below is justified rather than centered now, which is
            not a counter-example: every justified line is exactly as wide as
            the block, so each line's middle lands on that same axis. What
            the warning rules out is a line whose *middle* is off-axis, and
            neither centering nor justification produces one. */}
        <h2 className="pt-28 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-10 text-center">
          {isJa ? "自己紹介" : "About Me"}
        </h2>
        {/*
         * Set on a grid of a whole number of full-width characters per line,
         * which is the shape `reference/image9.jpg` is built on. Four things
         * in that frame decide the whole of this block:
         *
         *   1. every line holds the same number of characters — 13 in the
         *      reference ("反乱軍の苦闘は続いていた。", "恐るべき帝国宇宙艦隊の追撃",
         *      "から逃れ、ルーク・スカイウ"), 15 here by request;
         *   2. both edges are flush, only a paragraph's last line runs short;
         *   3. there is no kinsoku — "ォーカーに率いられた自由の" starts a line
         *      with a small kana, which is exactly what lets (1) hold;
         *   4. a paragraph's first line is indented one character.
         *
         * `w-[15em]` with the font size on the same element is what makes (1)
         * literal: outside `font-size` itself, `em` resolves against the
         * element's own computed size, so 15em *is* 15 full-width cells at
         * any size. That replaces the four breakpoint steps this used to
         * carry (`text-3xl sm:text-4xl lg:text-6xl xl:text-7xl`) — those were
         * an approximation of the same "hold characters-per-line" goal, and a
         * loose one: they measured out to 9.7 / 14.6 / 13.8 / 15.0 characters
         * across the breakpoints. With the measure fixed, size is free to be
         * one continuous figure.
         *
         * `4.8vw` is a ceiling, not a taste, and it is the half of this pair
         * that has to move whenever the cell count does: the scroller is the
         * shell's `w-[75%]`, so the font can be at most 75/15 = 5vw before
         * the block outgrows it, and 15 × 4.8vw = 72vw leaves 4% of headroom
         * under that. A block wider than the scroller would be clipped in the
         * scroller's own local space, before the perspective — the
         * `overflow-y: auto` forces `overflow-x: auto` trap the outer shell's
         * comment describes, which eats the far lines as hard as the near
         * ones. `4.5rem` caps it at what `xl:text-7xl` used to be, the size
         * already fitted to clear the planet (image9 has nothing but stars in
         * it to share the frame with). The cap only bites past a ~1500px
         * viewport, where 15em is 1080px against a 1125px scroller.
         *
         * `line-break: anywhere` is (3): without it a line that has to push a
         * 、 to the next row comes up one cell short, and justification opens
         * that missing cell up as visible letter-spacing across the whole
         * line. `indent-[1em]` is (4), and stays on the grid because one em
         * is exactly one cell — an indented first line is 12 cells, still a
         * whole number.
         *
         * `text-spacing-trim` / `text-autospace` are pinned rather than left
         * to the UA. Both insert or remove sub-em space around punctuation
         * and between kana and Latin, both have defaults that are still
         * moving, and either one firing would break the grid silently — the
         * text would still look fine, just no longer aligned.
         *
         * The grid also assumes the copy holds no half-width characters; the
         * Japanese paragraphs above are written with full-width Latin and
         * digits for that reason, and `aboutCopy.test.ts` is what keeps them
         * that way.
         */}
        <div
          ref={proseRef}
          className="space-y-10 w-[15em] mx-auto text-[min(4.8vw,4.5rem)] text-[#FFE81F] leading-snug text-justify indent-[1em] [line-break:anywhere] [text-spacing-trim:space-all] [text-autospace:no-autospace]"
        >
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Trailing space so the last line has somewhere to scroll up into
            the shrink before running out of column to scroll — and, since
            aboutScrollProgress now measures progress against proseRef's own
            bottom edge rather than this element's, headroom *past* that edge
            so the browser's actual scroll ceiling (scrollHeight -
            clientHeight, which this spacer is also what pads out) never
            arrives before progress can reach 1 — reaching the ceiling first
            would clamp scrollTop and strand the reader just short of "done".
            `110%` of the scroller's own height, 10 points more than the
            leading spacer's `h-full` (100%) above: the ceiling ends up a
            tenth of the scroller's own height — about a third of a screen —
            past proseRef's bottom edge, whatever the prose block's own
            height happens to be. Any figure over 100% keeps that guarantee;
            110% is not a number to chase precision on. */}
        <div aria-hidden className="h-[110%]" />
      </div>
    </motion.div>
  );
}
