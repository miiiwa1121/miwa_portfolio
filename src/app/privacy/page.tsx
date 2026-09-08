import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Miiiwa Portfolio",
  description: "Miiiwaのポートフォリオサイトにおける個人情報の取り扱い、Google AdSenseによる広告配信、Cookieの使用についてのポリシーです。",
  alternates: {
    canonical: "https://miiiwa.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fffdf7] text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors py-2 px-4 rounded-full bg-orange-50 hover:bg-orange-100"
          >
            <ArrowLeft size={16} />
            ポートフォリオへ戻る / Back to Portfolio
          </Link>
        </div>

        {/* Header */}
        <div className="border-b border-gray-200 pb-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
              <Shield size={22} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              プライバシーポリシー
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-mono">
            最終更新日: 2026年9月9日 / Last updated: September 9, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-gray-700 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-orange-500" />
              1. 基本方針
            </h2>
            <p>
              当ウェブサイト「Miiiwa Portfolio」（https://miiiwa.com、以下「当サイト」）は、利用者のプライバシーを尊重し、個人情報の保護に関する法令を遵守するとともに、適正な取り扱いに努めます。
            </p>
          </section>

          {/* Section 2: AdSense */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-orange-500" />
              2. 広告の配信について（Google AdSense）
            </h2>
            <div className="space-y-3">
              <p>
                当サイトでは、第三者配信事業者である Google が提供する広告配信サービス「Google AdSense」を利用しています。
              </p>
              <p>
                Google などの第三者配信事業者は、Cookie（クッキー）を使用して、利用者が当サイトや他のウェブサイトに過去にアクセスした情報に基づいて広告を配信します。
              </p>
              <p>
                Cookie を使用することにより、Google やそのパートナーは利用者の興味・関心に応じた適切な広告（パーソナライズド広告）を表示することができます。
              </p>
              <div className="mt-4 p-4 rounded-2xl bg-orange-50/60 border border-orange-200/50">
                <p className="font-semibold text-gray-900 mb-2">Cookie および広告配信の無効化について：</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>
                    利用者は、
                    <a
                      href="https://www.google.com/settings/ads"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 underline font-medium hover:text-orange-700"
                    >
                      Google の広告設定
                    </a>
                    から、パーソナライズド広告を無効にすることができます。
                  </li>
                  <li>
                    また、
                    <a
                      href="https://www.aboutads.info"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 underline font-medium hover:text-orange-700"
                    >
                      www.aboutads.info
                    </a>
                    にアクセスすることで、第三者配信事業者がパーソナライズド広告の掲載で使用する Cookie を無効にすることも可能です。
                  </li>
                  <li>
                    ブラウザの設定により、Cookie の受け入れを拒否することも可能です。詳細はお使いのブラウザのヘルプをご参照ください。
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Access Analysis */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-orange-500" />
              3. アクセス解析・ログ情報について
            </h2>
            <p>
              当サイトでは、サイトの利用状況の把握やサービス向上のため、アクセスログを収集・分析する場合があります。これらのログ情報は匿名で収集されており、個人を特定する情報は含まれません。
            </p>
          </section>

          {/* Section 4: Disclaimer */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-orange-500" />
              4. 免責事項
            </h2>
            <div className="space-y-3">
              <p>
                当サイトに掲載されているコンテンツや情報について、可能な限り正確な情報を掲載するよう努めておりますが、誤情報が混入したり、情報が古くなっている場合もあります。
              </p>
              <p>
                当サイトに掲載された内容によって生じた損害等の一切の責任を負いかねますのでご了承ください。また、当サイトからリンクやバナーなどによって他のサイトに移動された場合、移動先サイトで提供される情報やサービス等について一切の責任を負いません。
              </p>
            </div>
          </section>

          {/* Section 5: Copyright */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-orange-500" />
              5. 著作権・知的財産権
            </h2>
            <p>
              当サイトに掲載されている文章、画像、デザイン、プログラムコード等の著作権および知的財産権は、当サイト運営者（Miiiwa）または各権利所有者に帰属します。法的に認められた引用の範囲を超えて、無断で複製・転載・改変・再配布することを禁じます。
            </p>
          </section>

          {/* Section 6: Contact & Operator */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-orange-500" />
              6. 運営者情報・お問い合わせ
            </h2>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">運営者:</span> Miiiwa
              </p>
              <p>
                <span className="font-semibold">サイトURL:</span>{" "}
                <a href="https://miiiwa.com" className="text-orange-600 underline">
                  https://miiiwa.com
                </a>
              </p>
              <p>
                <span className="font-semibold">お問い合わせ:</span>{" "}
                当サイトのプライバシーポリシーや取り扱いに関するご質問・ご連絡は、
                <a
                  href="https://x.com/miiiwa3330"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 underline font-medium hover:text-orange-700"
                >
                  X（旧Twitter）: @miiiwa3330
                </a>
                のダイレクトメッセージ（DM）よりご連絡ください。
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Miiiwa. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
