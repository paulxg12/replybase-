import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@replybase/db";

/**
 * Custom Shopify OAuth provider for NextAuth.
 * Merchants install via Shopify OAuth, which creates their shop record.
 */
function ShopifyProvider() {
  return {
    id: "shopify",
    name: "Shopify",
    type: "oauth" as const,
    authorization: {
      url: `https://${process.env.SHOPIFY_SHOP_DOMAIN || "accounts.shopify.com"}/admin/oauth/authorize`,
      params: {
        scope: "read_orders,read_customers,read_products",
        client_id: process.env.SHOPIFY_API_KEY!,
      },
    },
    token: {
      url: `https://${process.env.SHOPIFY_SHOP_DOMAIN || "accounts.shopify.com"}/admin/oauth/access_token`,
    },
    userinfo: {
      url: `https://${process.env.SHOPIFY_SHOP_DOMAIN || "accounts.shopify.com"}/admin/api/2024-01/shop.json`,
      async request({ tokens }: { tokens: { access_token: string } }) {
        const res = await fetch(
          `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/shop.json`,
          {
            headers: {
              "X-Shopify-Access-Token": tokens.access_token,
            },
          }
        );
        const data = await res.json();
        return {
          id: data.shop.id.toString(),
          name: data.shop.name,
          email: data.shop.email,
          image: null,
          shopifyDomain: data.shop.domain,
        };
      },
    },
    profile(profile: any) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.image,
      };
    },
    clientId: process.env.SHOPIFY_API_KEY!,
    clientSecret: process.env.SHOPIFY_API_SECRET!,
  };
}

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [ShopifyProvider()],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        const merchant = await prisma.merchant.findFirst({
          where: { userId: user.id },
          select: { id: true, syncStatus: true },
        });

        if (merchant) {
          (session.user as any).merchantId = merchant.id;
          (session.user as any).merchantSyncStatus = merchant.syncStatus;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
};
