/**
 * Re-export from agent/lib — Eve runtime code must not import from src/lib.
 */
export {
  buildEnvelope,
  parseEnvelope,
  parseJobId,
  type JobEnvelope,
} from "../../agent/lib/job-envelope"
