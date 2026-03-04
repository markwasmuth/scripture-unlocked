const path = require('path');
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  experimental: {
    turbo: {
      root: path.resolve(__dirname),
    },
  },
};
module.exports = nextConfig;
