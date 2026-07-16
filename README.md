# 物件写真 自動加工アプリ(Netlify版)

複数の物件写真をまとめてアップロードすると、

1. 「メイン」写真 → AIでホームステージング(家具入れ)
2. 「青空加工」写真 → AIで青空・晴天に加工
3. 「そのまま」写真 → AI加工なし
4. すべての写真を **640×480(設定で変更可)にリサイズ + 透かし文字を合成**
5. ブラウザ上でプレビュー・個別ダウンロード・ZIP一括ダウンロード

を行う、Netlifyだけで動く完全クラウド版アプリです。ローカルPCやPhotoshopは不要です。

## ⚠ 重要: デプロイ方法について

**Netlifyダッシュボードへの「ドラッグ&ドロップ」だけではAI加工(青空加工・ホームステージング)が動きません。**

このアプリのAI加工は `netlify/edge-functions/ai-edit.ts` という Edge Function 経由でOpenAIを呼び出していますが、Netlifyの仕様上、Edge Functionsは

- ドラッグ&ドロップによる手動デプロイ → **反映されない**
- Netlify CLIでのデプロイ、またはGit連携の自動デプロイ → **反映される**

という違いがあります。ドラッグ&ドロップだけで公開すると、「リサイズ・透かし」は動きますが「AI加工」は毎回失敗し、元画像のまま処理されます(失敗した場合は画面に警告バナーとログが表示されます)。

**必ず以下のどちらかの方法でデプロイしてください。**

### 方法A: Netlify CLIでデプロイする(推奨・一番簡単)

1. パソコンにNode.jsをインストールしていない場合は https://nodejs.org からインストール
2. ターミナル(Mac)またはコマンドプロンプト/PowerShell(Windows)を開き、このフォルダに移動
   ```bash
   cd 展開したbukken-photo-netlifyフォルダのパス
   ```
3. Netlify CLIをインストールしてログイン
   ```bash
   npm install -g netlify-cli
   netlify login
   ```
   ブラウザが開くのでNetlifyアカウントで認証してください。
4. 既存のサイト(`bukken-photo-app`)に接続
   ```bash
   netlify link
   ```
   サイト一覧から `bukken-photo-app` を選択してください。
5. OpenAI APIキーを環境変数として設定
   ```bash
   netlify env:set OPENAI_API_KEY "sk-xxxxxxxx"
   ```
6. 本番デプロイ
   ```bash
   netlify deploy --prod
   ```

これで `netlify/edge-functions` も含めて正しく公開されます。今後、コードや設定(プロンプトなど)を変えたときも、この `netlify deploy --prod` を実行するだけで更新できます。

### 方法B: GitHub連携でデプロイする

1. このフォルダの中身をGitHubリポジトリにpush
2. Netlifyのダッシュボード → 対象サイト → 「Site configuration」→「Build & deploy」→「Link repository」で連携
3. 「Site configuration」→「Environment variables」で `OPENAI_API_KEY` を追加
4. 以後、GitHubにpushするたびに自動でデプロイされる(Edge Functionsも反映されます)

## OpenAI APIキーの取得方法

1. https://platform.openai.com/ でログイン→左メニュー「API keys」→「Create new secret key」
2. `sk-` から始まるキーをコピー
3. Billing(課金設定)にカードを登録し、少額チャージしておく(画像生成は従量課金)

## 構成とNetlifyの制約について

- リサイズ・透かし合成は **ブラウザ内のCanvas処理** で行っています(Photoshopドロップレットの代わり)。サーバー側の処理時間制限を受けないので、確実に動きます。
- AI加工(青空・ホームステージング)だけは、OpenAIのAPIキーを安全に隠すため **Netlify Edge Function**(`netlify/edge-functions/ai-edit.ts`)を経由しています(上記の「デプロイ方法」を参照)。
  - ブラウザから直接OpenAIを呼ぶことはできません(OpenAI側がブラウザからのアクセスをCORSでブロックしているため)。
  - Netlifyの通常のFunctions(10秒でタイムアウト)ではなくEdge Functionsを使っているのは、AI画像生成が数十秒かかることがあり、Edge Functionsの方が待てる時間が長い(応答ヘッダーまで40秒)ためです。それでも1枚あたり40秒を超えると失敗することがあります。その場合はエラーとして表示され、該当写真は元画像のままリサイズ・透かし工程に進みます。

## 動作確認方法

デプロイ後、画面右下(またはログ欄)に警告バナーが出ないかを確認してください。「Edge Functionが未デプロイの可能性があります」というエラーが出た場合は、上記の方法A・Bでデプロイし直してください。

## 設定のカスタマイズ

右上の「設定」から、ブラウザに保存される形で以下を調整できます(サーバーには送信されません)。

- 出力サイズ(初期値: 640×480)
- 透かし文字・色・不透明度・横位置・縦位置・文字の大きさ
- 青空加工/ホームステージングのプロンプト

透かしは横書き1行で、丸みのある柔らかいフォント(M PLUS Rounded 1c)で描画されます。

## ローカルで動作確認する場合

```bash
npm install -g netlify-cli
cd bukken-photo-netlify
netlify dev
```

`.env` ファイルを作るか `netlify env:set OPENAI_API_KEY "sk-xxxx"` でローカル用のキーも設定してください。

## フォルダ構成

```
bukken-photo-netlify/
├── netlify.toml
├── package.json
├── index.html                 # フロントエンド本体(ルート直下に配置)
├── public/index.html          # index.htmlと同じ内容(参考用に残しているだけで未使用)
├── netlify/
│   └── edge-functions/
│       └── ai-edit.ts        # OpenAI画像編集APIへの中継(APIキーはここだけに保存)
└── README.md
```

## トラブルシューティング

- **AI加工が毎回失敗し、元画像のまま処理される / 「Edge Functionが未デプロイの可能性があります」と出る**: ドラッグ&ドロップだけでデプロイしていませんか?上記の「方法A」または「方法B」でデプロイし直してください。
- **「サーバー側にOPENAI_API_KEYが設定されていません」と出る**: Netlifyの環境変数を設定後、再デプロイを忘れていないか確認してください(`netlify env:set` 後は改めて `netlify deploy --prod` が必要です)。
- **AI加工がよく失敗する(Edge Functionは動いているのに)**: 画像サイズが大きすぎる可能性があります。アップロード前に軽く圧縮する、または時間をおいて再試行してください。
- **透かしの位置や濃さが見本と違う**: 設定画面の「横位置」「縦位置」「不透明度」「文字の大きさ」を調整してください。
