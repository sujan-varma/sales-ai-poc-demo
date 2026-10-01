/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // self-contained server in .next/standalone for the Docker image (see Dockerfile)
  output: "standalone",
};

export default nextConfig;
