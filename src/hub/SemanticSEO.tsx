import { PROJECTS } from "@/data/projects";
import Link from "next/link";

/**
 * SemanticSEO:
 * Webアクセシビリティ（スクリーンリーダー）および検索エンジンクローラー（Google AdSense審査ボット含む）向けの
 * セマンティックなHTMLコンテンツです。
 * 
 * 3D CanvasメインのUIでは、Canvas内の描画テキストをクローラーが認識できず「有用性の低いコンテンツ / コンテンツ不足」と
 * 判定されてしまうリスクがあるため、ページの主要コンテンツ（自己紹介・制作物・経歴・スキル・免責・リンク）を
 * 標準的なHTMLセマンティックタグ（h1〜h3, article, section, p, ul, a）としてDOMに提供します。
 */
export default function SemanticSEO() {
  return (
    <div className="sr-only" aria-label="ポートフォリオサイトの概要とテキスト情報">
      <h1>Miiiwa | Portfolio - 面白いを最優先！</h1>
      <p>
        駆け出しの学生エンジニア（27卒）Miiiwaのポートフォリオサイトです。
        「面白いを最優先！」をモットーに、Webアプリケーション、3Dグラフィックス、モバイルアプリなどの開発に取り組んでいます。
      </p>

      {/* About Section */}
      <section aria-labelledby="seo-about-heading">
        <h2 id="seo-about-heading">自己紹介 (About Miiiwa)</h2>
        <p>
          2019年、漫画『王様達のヴァイキング』を読んだことをきっかけにプログラミングの世界に魅了されました。
          情報系高校へ進学し、C言語でアルゴリズムやメモリ管理の基礎を徹底的に習得。
          その後Pythonと出会い、自らのアイデアを形にするスピードと楽しさを知りました。
        </p>
        <p>
          2024年にはエンジニア養成機関「42tokyo」に入学し、ピアラーニング環境で自走力と本格的なソフトウェアエンジニアリングを鍛えています。
          2025年には東京大学松尾研究室のGCI（グローバル消費インテリジェンス寄付講座）を修了し、データサイエンスやAIの知見を深化。
          実社会の課題解決に向けた産学連携プロジェクトのリーダーやエンジニアインターンを経験しながら、多数のWebサービス・アプリを個人開発しています。
        </p>
      </section>

      {/* Products Section */}
      <section aria-labelledby="seo-products-heading">
        <h2 id="seo-products-heading">制作実績・プロダクト (Projects & Products)</h2>
        <div className="space-y-4">
          {PROJECTS.map((project) => (
            <article key={project.slug}>
              <h3>{project.title.ja} ({project.title.en})</h3>
              <p>{project.description.ja}</p>
              <p>使用技術・タグ: {project.tags.join(", ")}</p>
              <p>ステータス: {project.status}</p>
              {project.demoUrl && project.demoUrl !== "#" && (
                <p>
                  公開URL:{" "}
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                    {project.demoUrl}
                  </a>
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Skills Section */}
      <section aria-labelledby="seo-skills-heading">
        <h2 id="seo-skills-heading">保有スキル・技術スタック (Technical Skills)</h2>
        <ul>
          <li>フロントエンド: HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind CSS, Three.js</li>
          <li>バックエンド: Python, C, C#, Java, PHP, Laravel, Node.js</li>
          <li>モバイル: Swift, Flutter, Dart</li>
          <li>データベース: PostgreSQL, MySQL, SQLite, Supabase</li>
          <li>クラウド・インフラ: AWS, GCP, Cloudflare, Vercel</li>
          <li>ツール: Git, GitHub, Cypress, Figma</li>
          <li>AI: Claude, Gemini, ChatGPT</li>
        </ul>
      </section>

      {/* Experience Section */}
      <section aria-labelledby="seo-experience-heading">
        <h2 id="seo-experience-heading">経歴・タイムライン (Experience & History)</h2>
        <ul>
          <li>2019年: コンピュータの世界に目覚める</li>
          <li>2020年: 情報系高校へ進学</li>
          <li>2021年: C言語によるアルゴリズム・メモリ管理の基礎確立</li>
          <li>2023年: Pythonによるプロダクト開発の加速</li>
          <li>2024年: エンジニア養成機関「42tokyo」入学</li>
          <li>2025年: 東京大学松尾研究室 GCI 2025 修了（データサイエンス）</li>
          <li>2025年5月: 産学連携プロジェクトリーダー完遂</li>
          <li>2025年8月: リアルタイム位置共有Webアプリ「imadoko」リリース</li>
          <li>2025年11月: エンジニアインターンシップ開始</li>
          <li>2025年12月: P2Pスペースシェア「Sukima Park」アーキテクチャ設計</li>
          <li>2026年4月: 視線計測エンタメアプリ「Michaw（見ちゃう）」開発・リリース</li>
          <li>2026年7月: オンラインGD評価プラットフォーム「Umoja」開発中</li>
        </ul>
      </section>

      {/* Contact & Policy Section */}
      <section aria-labelledby="seo-contact-heading">
        <h2 id="seo-contact-heading">お問い合わせ & 法的情報 (Contact & Legal)</h2>
        <p>
          開発のご相談、ポートフォリオへのフィードバックなどは X（旧Twitter）
          <a href="https://x.com/miiiwa3330" target="_blank" rel="noopener noreferrer">
            @miiiwa3330
          </a>
          のDMより受け付けております。
        </p>
        <p>
          プライバシーポリシー・免責事項・Google AdSenseの広告配信ポリシーについては、
          <Link href="/privacy">こちらのプライバシーポリシーページ</Link>をご確認ください。
        </p>
      </section>
    </div>
  );
}
