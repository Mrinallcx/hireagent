import type { NextConfig } from "next"
import { withEve } from "eve/next"

const nextConfig: NextConfig = {
  /* config options here */
}

// withEve mounts the Eve runtime same-origin behind the Next app: `next dev`
// boots the Eve dev server and rewrites /eve/v1/* to it, and a single Vercel
// deploy ships both. This replaces the plan's manual two-process + CORS + URL
// coordination while the durable sync still flows through the Eve hook ->
// /api/internal/agent-events webhook -> repository.
//
// DISABLE_EVE=1 skips the integration so deterministic E2E (RESEARCH_MODE=mock)
// can run a plain, fast Next dev server without booting the Eve runtime.
export default process.env.DISABLE_EVE === "1" ? nextConfig : withEve(nextConfig)
