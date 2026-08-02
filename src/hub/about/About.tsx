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
      // `scrollTop` clamps itself at both ends, so an overscroll at the top or
      // the bottom stops there rather than being accumulated and having to be
      // scrolled back out of.
      element.scrollTop += wheelScrollStep(event.deltaY, event.deltaMode, element.clientHeight);
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
  useEffect(() => {
    let frameId: number;
    let lastTime: number | null = null;
    const tick = (now: number) => {
      const element = columnRef.current;
      const prose = proseRef.current;
      if (element && prose && lastTime !== null) {
        const realDeltaSeconds = (now - lastTime) / 1000;
        // The pace is a rate in *lines* (see ABOUT_AUTO_SCROLL_LINES_PER_SECOND),
        // so the prose block's own computed line height is what converts it to
        // pixels. Read fresh each frame rather than measured once: it changes
        // with the breakpoint, and a resize mid-read would otherwise leave the
        // crawl running at the previous width's speed.
        const lineHeight = parseFloat(getComputedStyle(prose).lineHeight);
        const step = autoScrollStep(sceneClock.delta(realDeltaSeconds), lineHeight);
        if (step > 0) element.scrollTop += step;
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
    const progress = aboutScrollProgress(el.scrollTop, el.scrollHeight, el.clientHeight);
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
        const now = aboutScrollProgress(
          column.scrollTop,
          column.scrollHeight,
          column.clientHeight
        );
        aboutReturn.publish(aboutReturnProgress(now));
        if (shouldReturnHome(now, Date.now() - openedAt.current)) finish();
      }, retry);
    }
  };

  const paragraphs = isJa
    ? [
        <>
          初めまして、<span className="font-bold">Miiiwa</span>です。
          「面白いを最優先！」をモットーに、日々新しい技術に触れながらプロダクト開発に挑戦している駆け出しの学生エンジニア（27卒）です。
        </>,
        <>
          きっかけは2019年、漫画『王様達のヴァイキング』を読んだことでした。コード一つで世界と対峙できるという事実に衝撃を受け、そこからコンピュータの世界にのめり込んでいます。翌年には情報系の高校へ進学し、C言語でアルゴリズムやメモリ管理といった土台を固めました。
        </>,
        <>
          転機になったのはPythonとの出会いです。思いついたものがその日のうちに動く——この速度を知ってから、作りたいものの数が一気に増えました。2024年にはエンジニア養成機関「42tokyo」へ入学し、ピアラーニングの環境で自走力とソフトウェアエンジニアリングを鍛え直しています。
        </>,
        <>
          2025年には東京大学松尾研究室のGCI（グローバル消費インテリジェンス寄付講座）を修了し、データサイエンスとAIの視点を手に入れました。同じ年、産学連携プロジェクトではリーダーとしてチーム開発を牽引し、実社会の課題に向き合う難しさと面白さを知りました。
        </>,
        <>
          個人開発では「imadoko」から始まり、P2Pスペースシェアリングの「Sukima Park」、「mesen」と作り続け、いまは新サービス「Umoja」を開発中です。要件定義からアーキテクチャ設計、実装までを一人で回すなかで、技術は目的ではなく手段だと考えるようになりました。
        </>,
        <>
          大切にしているのは、ただ動くものを作らないこと。「使ってて楽しい」「デザインがカッコいい」と思ってもらえる体験（UX）まで含めて、はじめてプロダクトだと思っています。このポートフォリオをボクセルの街にしたのも、その答えの一つです。
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
      className="pointer-events-none w-[75%] -ml-[5%] h-full [perspective:420px] [perspective-origin:50%_15%]"
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
        // This is the middle: perspective gentle enough (160px) that no line
        // anywhere in the readable band is distorted, plus a short mask
        // (12% of the column, `black_12%` below) that only ever touches
        // content the shrink has *already* taken most of the way — by the
        // time a line reaches that band it is a small fraction of reading
        // size, so the fade reads as the last bit of "too far to see" rather
        // than as its own effect.
        //
        // Yellow (`#FFE81F`) and bold, and sized to fill the frame near the
        // pivot rather than sit at reading size — reference/image8.png (a
        // screenshot marked up with the funnel this was built to match) and
        // reference/image9.jpg (an actual frame of the film, where the
        // nearest line is cut off by both the bottom and side of the frame)
        // are both scaled far larger than body text anywhere else on the
        // site.
        className="pointer-events-auto w-full h-full overflow-y-auto text-[#FFE81F] font-bold [text-shadow:0_0_12px_#070a14,0_0_4px_#070a14,0_2px_3px_rgba(0,0,0,0.9)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [transform:rotateX(46deg)] [transform-origin:50%_100%] [mask-image:linear-gradient(to_bottom,transparent,black_12%)]"
      >
        {/*
         * Leading space exactly one scroller tall, which is what makes the
         * first line arrive **at the bottom edge of the frame** rather than
         * already halfway up it.
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
            gets smaller, never skewed. */}
        <h2 className="pt-28 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-10 text-center">
          {isJa ? "自己紹介" : "About Me"}
        </h2>
        {/*
         * Sized by characters-per-line rather than by a comfortable reading
         * size, which is the measurement `reference/image9.jpg` actually
         * supports: its lines hold 13-15 characters and a character in the
         * middle of the frame stands about a tenth of the frame's height.
         * Since the box is 128% of the viewport, "13-15 per line" fixes the
         * type size at roughly `viewportWidth * 1.28 / 14` — hence a step per
         * breakpoint rather than one figure, because that ratio is the thing
         * being held constant, not the pixel size.
         *
         * It was `text-3xl sm:text-4xl` (30/36px). The funnel renders the
         * middle of the frame at about 60% of the declared size, so 36px was
         * being read at 22px at best and single digits further up — the whole
         * column below reading size, which is what made the crawl a texture
         * rather than a paragraph.
         */}
        {/* One step down from the `text-4xl … xl:text-[6.5rem]` first fitted
            to image9.jpg. The reference frame has nothing in it but stars;
            this one has a planet to share the screen with, and at the larger
            size the near lines reached it however far left the column was
            pushed. Same shape, same 3-4 lines to a paragraph — just enough
            smaller to clear the disc. */}
        <div
          ref={proseRef}
          className="space-y-10 text-3xl sm:text-4xl lg:text-6xl xl:text-7xl text-[#FFE81F] leading-snug text-center"
        >
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Trailing space so the last line has somewhere to scroll up into
            the shrink before running out of column to scroll. Shorter than
            the full screen the flat version needed — `h-2/3`, not `h-full`
            — because the crawl no longer has to carry the line all the way
            to the physical top edge to lose it; by a third of the way down
            from there, the tilt alone has already taken it past reading
            size. */}
        <div aria-hidden className="h-2/3" />
      </div>
    </motion.div>
  );
}
