import type { AutonomyContract } from "../core/policy/types.ts";
import type { SandboxPolicy } from "./contract.ts";

const READ_TOOLS = ["Read", "Glob", "Grep"];
const WRITE_TOOLS = ["Edit", "Write"];

// Adapters never decide permissions: the sandbox is derived from the autonomy contract (and whether the user approved the task).
// Anything the contract does not grant, or that needs approval the user has not given, is simply not in the tool list.
export function sandboxFromContract(contract: AutonomyContract, userApproved: boolean): SandboxPolicy {
  const granted = (action: "file.write" | "shell.exec") =>
    contract.allowedActions.includes(action) && (!contract.approvalRequiredActions.includes(action) || userApproved);
  const tools = [...READ_TOOLS];
  const canWrite = granted("file.write");
  if (canWrite) tools.push(...WRITE_TOOLS);
  // A shell can write anywhere the sandbox allows, so Bash is only ever granted together with write access.
  if (canWrite && granted("shell.exec")) tools.push("Bash");
  return { permission: canWrite ? "workspace_write" : "read_only", allowedTools: tools };
}
