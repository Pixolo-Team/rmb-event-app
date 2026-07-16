/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
