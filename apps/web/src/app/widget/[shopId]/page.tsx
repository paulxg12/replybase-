import { ChatWidget } from "@/components/ChatWidget";

interface WidgetPageProps {
  params: { shopId: string };
}

export default function WidgetPage({ params }: WidgetPageProps) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, height: "100vh", overflow: "hidden" }}>
        <ChatWidget shopId={params.shopId} />
      </body>
    </html>
  );
}
