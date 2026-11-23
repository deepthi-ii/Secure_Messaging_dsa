import "server-only";
import { createHash } from "node:crypto";
import type { HashFn } from "./crypto";

/** Independent SHA-256 implementation (Node.js crypto) used by the API layer to cross-check the browser. */
export const nodeSha256: HashFn = async (data) => new Uint8Array(createHash("sha256").update(data).digest());
