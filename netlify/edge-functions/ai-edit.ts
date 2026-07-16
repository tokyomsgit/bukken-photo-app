import type { Context, Config } from "@netlify/edge-functions";

// OpenAI画像編集APIへの中継用Edge Function
// - ブラウザからOpenAIへ直接fetchするとCORSでブロックされるため、これを経由する
// - APIキーはNetlifyの環境変数(OPENAI_API_KEY)にのみ保存され、ブラウザには一切渡らない

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") {
    return json({ error: "POSTメソッドのみ対応しています。" }, 405);
  }

  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json(
      { error: "サーバー側にOPENAI_API_KEYが設定されていません。Netlifyの環境変数を確認してください。" },
      500
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return json({ error: "リクエストの形式が不正です(multipart/form-dataで送ってください)。" }, 400);
  }

  const image = incoming.get("image");
  const prompt = incoming.get("prompt");
  const model = (incoming.get("model") as string) || "gpt-image-1";

  if (!(image instanceof File)) {
    return json({ error: "画像(image)が送られていません。" }, 400);
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return json({ error: "プロンプト(prompt)が空です。" }, 400);
  }

  const outgoing = new FormData();
  outgoing.append("model", model);
  outgoing.append("prompt", prompt);
  outgoing.append("image", image, image.name || "image.png");

  let openaiRes: Response;
  try {
    openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outgoing,
    });
  } catch (e) {
    return json({ error: `OpenAIへの接続に失敗しました: ${e}` }, 502);
  }

  let data: any;
  try {
    data = await openaiRes.json();
  } catch {
    return json({ error: "OpenAIからの応答を解析できませんでした。" }, 502);
  }

  if (!openaiRes.ok) {
    const message = data?.error?.message || `OpenAI APIエラー(status ${openaiRes.status})`;
    return json({ error: message }, openaiRes.status);
  }

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    return json({ error: "OpenAIの応答に画像データが含まれていませんでした。" }, 502);
  }

  return json({ b64_json: b64 });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const config: Config = { path: "/api/ai-edit" };
