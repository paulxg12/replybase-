"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from "@replybase/ui";
import { trpc } from "@/lib/trpc";
import { LoadingSpinner } from "@replybase/ui";
import { useToast } from "@/lib/use-toast";

export default function WidgetPage() {
  const { status } = useSession();
  const toast = useToast();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [brandColor, setBrandColor] = useState("#4F6EF7");
  const [brandName, setBrandName] = useState("Support");
  const [initialMessage, setInitialMessage] = useState("Hi there! How can we help?");
  const [placeholder, setPlaceholder] = useState("Type your question...");
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      loadMerchant();
    }
  }, [status]);

  const loadMerchant = async () => {
    try {
      setLoading(true);
      const result = await trpc.merchants.getCurrent.query();
      setMerchant(result);
      
      // Load config if available
      if (result.config) {
        setBrandColor(result.config.brandColor || "#4F6EF7");
        setBrandName(result.config.brandName || "Support");
        setInitialMessage(result.config.initialMessage || "Hi there! How can we help?");
        setPlaceholder(result.config.placeholder || "Type your question...");
      }
    } catch (err) {
      console.error("Failed to load merchant");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setUpdating(true);
    try {
      await trpc.merchants.updateWidgetConfig.mutate({
        brandColor,
        brandName,
        initialMessage,
        placeholder,
      });
      toast.success("Widget configuration saved!");
    } catch (err) {
      toast.error("Failed to update widget", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Failed to load merchant data</p>
      </div>
    );
  }

  const embedCode = `<script>
  (function() {
    const config = {
      merchantPublicKey: "${merchant.widgetPublicKey}",
      apiUrl: "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}",
      brandColor: "${brandColor}",
      brandName: "${brandName}",
      initialMessage: "${initialMessage}",
      placeholder: "${placeholder}"
    };
    
    const script = document.createElement("script");
    script.src = "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/widget.js";
    script.dataset.config = JSON.stringify(config);
    document.body.appendChild(script);
  })();
</script>`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">
          Widget & Embed Code
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Configure and get your widget embed code for Shopify
        </p>
      </div>

      {/* Widget Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* Preview */}
            <div className="flex-1">
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-4">
                  <p className="text-xs text-gray-600 mb-3">Widget Preview</p>
                  
                  {/* Simulated Widget */}
                  <div
                    className="rounded-lg shadow-lg overflow-hidden"
                    style={{ width: "350px", backgroundColor: "white" }}
                  >
                    {/* Header */}
                    <div
                      className="p-4 text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      <h3 className="font-bold text-lg">{brandName}</h3>
                    </div>

                    {/* Messages */}
                    <div className="p-4 h-48 bg-gray-50 flex flex-col">
                      <div className="flex justify-start mb-3">
                        <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm max-w-xs">
                          {initialMessage}
                        </div>
                      </div>
                      <div className="mt-auto" />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={placeholder}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          disabled
                        />
                        <button
                          style={{ backgroundColor: brandColor }}
                          className="text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary">
                  Brand Color
                </label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary">
                  Brand Name
                </label>
                <Input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Support"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary">
                  Initial Message
                </label>
                <Input
                  type="text"
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="How can we help?"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary">
                  Input Placeholder
                </label>
                <Input
                  type="text"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="Type your question..."
                  className="mt-2"
                />
              </div>

              <Button onClick={handleUpdateConfig} disabled={updating} className="w-full">
                {updating ? "Updating..." : "Update Configuration"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle>Embed Code for Shopify</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            Copy this code and paste it into your Shopify theme's footer or product pages:
          </p>

          <div className="relative">
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
              <code>{embedCode}</code>
            </pre>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(embedCode)}
              className="absolute top-2 right-2"
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm">
            <p className="text-blue-900">
              <strong>Installation Steps:</strong>
            </p>
            <ol className="text-blue-800 space-y-1 mt-2 list-decimal list-inside">
              <li>Go to Shopify Admin → Theme</li>
              <li>Click "Edit Code" on your current theme</li>
              <li>Find <code className="bg-blue-100 px-1 rounded">theme.liquid</code> or <code className="bg-blue-100 px-1 rounded">footer.liquid</code></li>
              <li>Paste the code before the closing <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> tag</li>
              <li>Save and test on your store</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Widget Key */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-text-primary">
              Widget Public Key
            </label>
            <div className="flex gap-2 mt-2">
              <Input
                type="text"
                value={merchant.widgetPublicKey}
                disabled
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(merchant.widgetPublicKey)}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              This key identifies your store to the widget API
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="p-6 bg-green-50 border-green-200">
        <h4 className="font-semibold text-green-950 mb-2">✓ Widget Ready</h4>
        <p className="text-sm text-green-800">
          Your widget is configured and ready to use. It will automatically appear on your Shopify store once installed.
        </p>
      </Card>
    </div>
  );
}
