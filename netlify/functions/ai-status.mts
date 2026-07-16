import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// AI加工ジョブの進捗確認用エンドポイント。フロント側から定期的に呼ばれる(ポーリング)。

export default async (req: Request) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return json({ status: "error", error: "jobIdが指定されていません。" }, 400);
  }

  const store = getStore("ai-jobs");
  const result = await store.get(jobId, { type: "json" });

  if (!result) {
    return json({ status: "pending" });
  }

  return json(result as Record<string, unknown>);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const config: Config = {
  path: "/api/ai-status",
};
