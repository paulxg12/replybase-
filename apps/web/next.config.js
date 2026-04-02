/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@replybase/ui",
    "@replybase/db",
    "@replybase/rag",
    "@replybase/gorgias",
    "@replybase/shopify",
  ],
};

module.exports = config;
