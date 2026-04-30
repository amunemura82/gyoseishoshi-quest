# 行政書士クエスト MVP

行政書士試験の学習をゲーム化するWebアプリです。

## できること

- 開始ボタンで今日の学習範囲をAI生成
- 要点まとめ表示
- 5問クリック回答
- 自動採点
- EXP / Lv保存
- 弱点分析
- ブラウザのlocalStorageに履歴保存

## 動かし方

```bash
npm install
cp .env.example .env.local
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## OpenAI APIキーの設定

`.env.local` に以下を入れてください。

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5.2
```

APIキーが未設定でも、内蔵のフォールバック問題で動きます。

## Vercelに公開する場合

1. GitHubにこのフォルダをアップロード
2. VercelでImport Project
3. Environment Variablesに以下を追加
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`（任意。例：`gpt-5.2`）
4. Deploy

## 注意

MVPでは正解データもフロントへ返しています。個人学習用には問題ありませんが、本格サービス化する場合は採点をサーバー側に移してください。
