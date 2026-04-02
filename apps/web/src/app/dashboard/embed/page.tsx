"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function EmbedPage() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);

  const shopId = (session?.user as any)?.merchantId || "YOUR_SHOP_ID";

  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL || "https://replybase.app"}/embed.js" data-shop-id="${shopId}"></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Embed Widget</h2>
        <p className="text-sm text-text-secondary mt-1">
          Copy-paste this script tag into your Shopify theme to add the chat widget.
        </p>
      </div>

      {/* Embed Code */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Script Tag</h3>
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
            <code>{embedCode}</code>
          </pre>
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 px-3 py-1 bg-brand-500 text-white text-xs rounded-md hover:bg-brand-600"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-950 mb-3">Installation Steps</h4>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Go to Shopify Admin → Online Store → Themes</li>
          <li>Click &quot;Edit Code&quot; on your current theme</li>
          <li>Find <code className="bg-blue-100 px-1 rounded">theme.liquid</code></li>
          <li>Paste the script before the closing <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> tag</li>
          <li>Save and test on your store</li>
        </ol>
      </div>

      {/* Preview Link */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Preview</h3>
        <p className="text-sm text-text-secondary mb-3">
          See how the widget looks before installing:
        </p>
        <a
          href={`/widget/${shopId}`}
          target="_blank"
          className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 inline-block"
        >
          Open Widget Preview
        </a>
      </div>
    </div>
  );
}
