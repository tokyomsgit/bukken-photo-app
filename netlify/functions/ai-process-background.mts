import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// 物件写真のAI加工(青空加工・家具配置)をバックグラウンドで実行するFunction。
// Edge Functionの40秒タイムアウトでは、OpenAIの画像生成(数十秒〜100秒以上かかることがある)を
// 待ちきれず失敗することがあったため、最大15分まで実行できるBackground Functionに切り替えている。
// 結果はNetlify Blobsに保存し、フロント側は /api/ai-status でポーリングして取得する。

export default async (req: Request) => {
  const store = getStore("ai-jobs");
  let jobId = "";

  try {
    const body = await req.json();
    jobId = body.jobId;
    const { imageBase64, prompt, model } = body;

    if (!jobId) return new Response("no jobId");

    const apiKey = process.env.OPENAI_KEY_CUSTOM?.trim().replace(/^["']|["']$/g, "");
    if (!apiKey) {
      await store.setJSON(jobId, { status: "error", error: "サーバー側にOPENAI_KEY_CUSTOMが設定されていません。" });
      return new Response("ok");
    }

    if (!imageBase64 || !prompt) {
      await store.setJSON(jobId, { status: "error", error: "画像またはプロンプトが送られていません。" });
      return new Response("ok");
    }

    const base64Data = String(imageBase64).split(",").pop() || "";
    const binary = Buffer.from(base64Data, "base64");
    const imageBlob = new Blob([binary], { type: "image/jpeg" });

    const fd = new FormData();
    fd.append("model", model || "gpt-image-2");
    fd.append("prompt", prompt);
    fd.append("image", imageBlob, "upload.jpg");

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    const rawText = await openaiRes.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      await store.setJSON(jobId, {
        status: "error",
        error: `OpenAIからの応答を解析できませんでした(status ${openaiRes.status})。`,
      });
      return new Response("ok");
    }

    if (!openaiRes.ok) {
      const message = data?.error?.message || `OpenAI APIエラー(status ${openaiRes.status})`;
      await store.setJSON(jobId, { status: "error", error: message });
      return new Response("ok");
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      await store.setJSON(jobId, { status: "error", error: "OpenAIの応答に画像データが含まれていませんでした。" });
      return new Response("ok");
    }

    await store.setJSON(jobId, { status: "done", b64_json: b64 });
    return new Response("ok");
  } catch (e) {
    if (jobId) {
      await store.setJSON(jobId, { status: "error", error: `予期しないエラー: ${e}` });
    }
    return new Response("ok");
  }
};

export const config: Config = {
  background: true,
  path: "/api/ai-process-background",
};
