import type { Classification } from "./schema.ts";

export interface ClassifyInput {
  message: string;
  detail?: string;
  // The test failed in an earlier attempt and passed on a retry.
  passedOnRetry?: boolean;
  // The run itself timed out, crashed or could not start: the failure says nothing about the product.
  runLevel?: "timeout" | "spawn_error" | "crash" | "cancelled";
}

const ENVIRONMENT = [
  /\bENOENT\b/,
  /\bEACCES\b/,
  /\bEPERM\b/,
  /\bEADDRINUSE\b/,
  /\bECONNREFUSED\b/,
  /\bENOTFOUND\b/,
  /\bEMFILE\b/,
  /ERR_MODULE_NOT_FOUND|Cannot find (module|package)/i,
  /executable (doesn't|does not) exist|browser.*(not found|failed to launch)|Failed to launch/i,
  /\bEPIPE\b/,
  /ERR_ACCESS_DENIED|Access to this API has been restricted|requires full fs\.(read|write) permissions/,
];

const PRODUCT = [/AssertionError/, /ERR_ASSERTION/, /expected .* (to|but)/i, /strictly equal|deepEqual|!==|Expected values/i, /expect\(/i, /Expected (text|visible|element)/i];

// Deterministic, ordered rules; no model decides. Order matters: infra, then flaky, then environment, then product defect.
export function classifyFailure(input: ClassifyInput): Classification {
  if (input.runLevel) return "infra";
  if (input.passedOnRetry) return "flaky";
  const text = `${input.message}\n${input.detail ?? ""}`;
  if (ENVIRONMENT.some((r) => r.test(text))) return "environment";
  if (PRODUCT.some((r) => r.test(text))) return "product_defect";
  // An unexplained failure is treated as a product defect: failing closed is safer than excusing it.
  return "product_defect";
}
