/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF encoding (sharp/libavif) can hang or take tens of seconds per
    // image in Next's dev-mode optimizer for some source files — seen
    // firsthand as pages appearing to never finish loading their hero
    // image. WebP still gives the modern-format size win without that risk.
    formats: ["image/webp"],
  },
};

module.exports = nextConfig;
