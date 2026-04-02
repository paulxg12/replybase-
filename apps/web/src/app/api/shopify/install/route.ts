import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@replybase/db";

/**
 * POST /api/shopify/install — Shopify OAuth install flow
 *
 * Step 1: Redirect to Shopify for authorization
 * Step 2: Handle callback with shop domain and auth code
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shop } = body;

    if (!shop) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "shop domain is required" } },
        { status: 400 }
      );
    }

    const apiKey = process.env.SHOPIFY_API_KEY;
    const scopes = "read_orders,read_customers,read_products";
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/shopify/callback`;

    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return NextResponse.json({ ok: true, data: { installUrl } });
  } catch (error) {
    console.error("Shopify install failed:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "Failed to start install" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shopify/install — Handle callback from Shopify OAuth
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const code = searchParams.get("code");

    if (!shop || !code) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "shop and code are required" } },
        { status: 400 }
      );
    }

    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.json(
        { ok: false, error: { code: "AUTH_FAILED", message: "Failed to get access token" } },
        { status: 401 }
      );
    }

    // Get shop info
    const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": tokenData.access_token },
    });
    const shopData = await shopRes.json();

    // Upsert merchant
    await prisma.merchant.upsert({
      where: { shopifyDomain: shop },
      update: {
        shopifyAccessToken: tokenData.access_token,
        displayName: shopData.shop?.name || shop,
      },
      create: {
        shopifyDomain: shop,
        shopifyAccessToken: tokenData.access_token,
        displayName: shopData.shop?.name || shop,
        gorgiasSubdomain: "",
        gorgiasApiKey: "",
        gorgiasApiEmail: "",
        userId: "system", // Will be linked to actual user during onboarding
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard?installed=true", process.env.NEXTAUTH_URL || "http://localhost:3000")
    );
  } catch (error) {
    console.error("Shopify callback failed:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "OAuth callback failed" } },
      { status: 500 }
    );
  }
}
