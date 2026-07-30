"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "../LanguageContext";
import { motion } from "framer-motion";
import {
  aboutReturn,
  aboutReturnProgress,
  aboutScrollProgress,
  settleRetryDelay,
  shouldReturnHome,
  wheelScrollStep,
} from "../aboutScroll";

/**
 * The About column: text straight over the diorama, with no card and no sheet.
 *
 * The only area you leave by finishing it. Every other section is a full-screen
 * panel bracketed by transparent spacers, and scrolling off either one returns;
 * here the column itself is the scroller, and reaching the bottom of the
 * writing is what goes home. That replaced a HOME button — a control that had
 * to be noticed and aimed at, sitting over a page whose whole premise is that
 * you get around by moving through it.
 *
 * The column is a full screen tall and ends in one blank viewport, so the text
 * runs from the bottom edge to the top edge and the scroll carries it clean
 * off the top rather than stopping with the last line still showing. That
 * spacer is also what makes the progress figure mean something the camera can
 * use: the scrollable range is exactly the height of the writing, so progress
 * reads as "how much of the text has passed the top of the screen" — half read
 * is half gone is half way home.
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
      ref={columnRef}
      // Marks this as a real control, so the scene's drag handler leaves the
      // gesture alone instead of orbiting the diorama behind the text.
      data-ui
      onScroll={handleScroll}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5 }}
      // No card chrome — this sits directly over the diorama, so the text
      // itself needs a soft light shadow to stay legible over whatever part
      // of the scene is behind it, the same treatment as the logo in the header.
      //
      // The scrollbar is hidden and both edges are masked into fades instead.
      // A track down the side of frameless text reads as the edge of a panel
      // that is not there, where the fades say "this carries on" in the
      // language the rest of the page already uses. Now that the column runs
      // the full height of the screen the top needs one as much as the bottom:
      // it is what dissolves each line as it goes, rather than slicing it on
      // the screen edge underneath the logo.
      className="pointer-events-auto w-full max-w-lg h-full overflow-y-auto text-gray-900 [text-shadow:0_1px_8px_rgba(255,255,255,0.85)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_104px,black_calc(100%-88px),transparent)]"
    >
      {/* Clear of the header on the first screenful. Padding rather than a
          margin on the scroller, so it scrolls away with the text instead of
          holding a permanent gap the writing can never use. */}
      <h2 className="pt-28 text-3xl sm:text-4xl font-black tracking-tight mb-8">
        {isJa ? "自己紹介" : "About Me"}
      </h2>
      <div className="space-y-6 text-gray-800 leading-loose text-base sm:text-lg font-medium">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {/* One blank screen after the writing, which is what lets the last line
          leave the top of the screen instead of stopping at the bottom of it.
          `h-full` and not `h-screen`: it has to be the scroller's own height
          to the pixel — that equality is what makes the scrollable range come
          out as exactly the height of the text, and so what makes progress 1
          mean "the writing has gone" and nothing else. */}
      <div aria-hidden className="h-full" />
    </motion.div>
  );
}
