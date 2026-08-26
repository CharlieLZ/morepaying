import { execFileSync } from "node:child_process"

export function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

export function gitMessage() {
  try {
    return execFileSync("git", ["log", "-1", "--format=%B"], { encoding: "utf8" })
  } catch {
    return ""
  }
}

export function skipGit(flag) {
  return flag === true || process.env.MOREPAYING_SKIP_GIT === "1"
}

export function assertReadyGit(id, skip) {
  if (skipGit(skip)) return
  const msg = gitMessage()
  if (!msg.includes(`MorePaying-Ready: ${id}`) && !msg.includes("MorePaying-Ready: all")) {
    throw new Error(
      `ready_git_trailer_required: last commit must include MorePaying-Ready: ${id} (or pass --skip-git for local)`,
    )
  }
}

export function assertReleaseSha(sha) {
  if (!sha) throw new Error("release_sha_required")
  if (sha === "local-mvp") return sha
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) throw new Error("release_sha_required")
  const head = gitHead()
  if (!head) return sha
  const left = head.toLowerCase()
  const right = sha.toLowerCase()
  if (left.startsWith(right) || right.startsWith(left.slice(0, 7))) return head
  throw new Error(`release_sha_mismatch: HEAD is ${head.slice(0, 12)}, got ${sha}`)
}
