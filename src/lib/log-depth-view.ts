// Fire-and-forget instrumentation call, shared by the ask screen and Shorts — the
// "depth-selection distribution" diagnostic KPI (docs/decisions.md §5) has no signal to draw
// from otherwise. Never awaited by callers; a failed log is not worth blocking or retrying for.
export function logDepthView(questionId: string, depth: "gist" | "explore" | "stick") {
  fetch("/api/depth-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, depth }),
  }).catch(() => {});
}
