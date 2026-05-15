import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const workspaceEnvPath = resolve(process.cwd(), "../../.env.local");

if (existsSync(workspaceEnvPath)) {
  loadEnv({ path: workspaceEnvPath, override: false, quiet: true });
}

const nextConfig: NextConfig = {
  transpilePackages: ["@pippa/db", "@pippa/domain"],
};

export default nextConfig;
