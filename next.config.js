/** @type {import('next').NextConfig} */
const { execSync } = require('child_process')

// Commit-SHA des Builds: Auf Vercel setzt die Git-Integration VERCEL_GIT_COMMIT_SHA,
// lokal fällt der Build auf git rev-parse zurück. Build-Zeitpunkt = Zeitpunkt des Builds.
let commitSha = process.env.VERCEL_GIT_COMMIT_SHA || ''
if (!commitSha) {
  try {
    commitSha = execSync('git rev-parse HEAD').toString().trim()
  } catch {
    commitSha = ''
  }
}

module.exports = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString()
  },
  reactStrictMode: true,
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['better-sqlite3', 'drizzle-orm']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com'
      }
    ]
  }
}
