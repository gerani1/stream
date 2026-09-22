import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ['@board/shared'],
  webpack(config) {
    // Explicit, deterministic alias for "@/*" — not left to Next's internal
    // tsconfig-paths detection. That detection reliably worked against a
    // long-lived local node_modules, but failed with "Module not found:
    // Can't resolve '@/lib/api'" on a from-scratch install (confirmed by
    // cloning HEAD into an isolated directory and reproducing the exact
    // Vercel error — adding `baseUrl` to tsconfig.json did not fix it, only
    // this did). Likely a version/plugin quirk in how Next's internal
    // jsconfig-paths-webpack-plugin resolves a monorepo tsconfig `extends`
    // chain on a clean install; this sidesteps it entirely.
    config.resolve.alias['@'] = path.join(__dirname, 'src');
    return config;
  },
};
