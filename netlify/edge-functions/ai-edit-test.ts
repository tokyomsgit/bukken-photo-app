// このファイルは開発中の検証用に作られた未使用のファイルです。
// デプロイ時に混乱しないよう、どのパスにも反応しないよう設定しています。
// 削除して問題ありません(不要であれば削除してください)。
export default async (request: Request) => new Response("unused", { status: 404 });
export const config = { path: "/__unused_test_endpoint_do_not_call__" };
