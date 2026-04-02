"use client";

import { useState } from "react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [gorgiasSubdomain, setGorgiasSubdomain] = useState("");
  const [gorgiasEmail, setGorgiasEmail] = useState("");
  const [gorgiasApiKey, setGorgiasApiKey] = useState("");
  const [crawlUrls, setCrawlUrls] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStep1 = async () => {
    setLoading(true);
    // TODO: validate and save Gorgias credentials
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleStep2 = async () => {
    setLoading(true);
    // TODO: trigger initial crawl
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1000);
  };

  const handleStep3 = () => {
    onComplete();
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              s <= step ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`w-16 h-1 ${s < step ? "bg-brand-500" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold">Step 1: Connect Gorgias</h3>
          <p className="text-sm text-text-secondary">Enter your Gorgias credentials to sync support tickets.</p>
          <input type="text" value={gorgiasSubdomain} onChange={(e) => setGorgiasSubdomain(e.target.value)} placeholder="Subdomain" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input type="email" value={gorgiasEmail} onChange={(e) => setGorgiasEmail(e.target.value)} placeholder="API Email" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input type="password" value={gorgiasApiKey} onChange={(e) => setGorgiasApiKey(e.target.value)} placeholder="API Key" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <button onClick={handleStep1} disabled={loading} className="w-full px-4 py-2 bg-brand-500 text-white rounded-md">
            {loading ? "Connecting..." : "Connect Gorgias"}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold">Step 2: Crawl Your Store</h3>
          <p className="text-sm text-text-secondary">Add URLs to crawl for FAQ/product pages.</p>
          <textarea value={crawlUrls} onChange={(e) => setCrawlUrls(e.target.value)} placeholder="https://your-store.com/faq&#10;https://your-store.com/help" className="w-full px-3 py-2 border rounded-lg text-sm" rows={4} />
          <button onClick={handleStep2} disabled={loading} className="w-full px-4 py-2 bg-brand-500 text-white rounded-md">
            {loading ? "Crawling..." : "Crawl Store Pages"}
          </button>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="bg-white border rounded-lg p-6 space-y-4 text-center">
          <div className="text-4xl">🚀</div>
          <h3 className="text-xl font-semibold">You're All Set!</h3>
          <p className="text-sm text-text-secondary">Your chatbot is ready. Embed it on your store to go live.</p>
          <button onClick={handleStep3} className="px-6 py-2 bg-brand-500 text-white rounded-md">
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
