export type UserProfile = {
  exp: number;
  sessions: Array<{
    lessonId: string;
    subject: string;
    score: number;
    correct: number;
    exp: number;
    date: string;
  }>;
  weak: Record<string, number>;
};

export function buildLessonPrompt(profile: UserProfile) {
  const recent = profile.sessions.slice(-8);
  return `
あなたは行政書士試験の学習をゲーム化するトレーナーです。

目的：
ユーザーに対して「範囲決定 → インプット → 問題 → 採点 → 成長分析」まで行うWebアプリ用の学習データを生成する。

基本ルール：
- 毎回、学習範囲はあなたが決める。
- 分野は行政法・民法・一般知識からバランスよく選ぶ。
- 難易度はユーザーの過去回答から調整する。
- 説明は短く本質のみ。
- 難しくしすぎない。
- 思考力重視。
- 淡々としたコーチング。

ゲーム要素：
- 1問正解＝20EXP。
- 全問正解＝+50EXP。
- 60%以上で維持。
- 80%以上でレベルアップ。

レベル設計：
- Lv1〜3：用語理解。
- Lv4〜6：条文理解。
- Lv7〜9：判例思考。
- Lv10：本試験レベル。

現在のユーザーデータ：
${JSON.stringify({ exp: profile.exp, weak: profile.weak, recent }, null, 2)}

出力条件：
次のJSONだけを出力してください。Markdown、説明文、コードブロックは禁止。

{
  "lessonId": "短い英数字ID",
  "subject": "行政法 or 民法 or 一般知識",
  "title": "今日の学習範囲名",
  "levelBand": "Lv1〜3 など",
  "summary": ["要点1", "要点2", "要点3"],
  "keywords": ["重要語1", "重要語2", "重要語3"],
  "questions": [
    {
      "q": "問題文",
      "options": ["選択肢A", "選択肢B", "選択肢C"],
      "answer": 0,
      "explanation": "短い解説"
    }
  ],
  "coachNote": "今日の意識ポイントを1文"
}

制約：
- questionsは必ず5問。
- optionsは必ず3択。
- answerは0,1,2のいずれか。
- summaryは3文以内。
- keywordsは3つ以内。
- 本試験に近いが、初学者が折れない難度にする。
- 正解番号が偏らないようにする。
`;
}

export const fallbackLesson = {
  lessonId: "admin-act-basic-fallback",
  subject: "行政法",
  title: "行政行為の基本分類",
  levelBand: "Lv1〜3",
  summary: [
    "行政行為とは、行政が一方的に国民の権利義務へ影響を与える行為。",
    "許可は、禁止されている行為を解除するもの。",
    "認可は効力を補充し、特許は新しい権利を与えるもの。"
  ],
  keywords: ["許可", "認可", "特許"],
  questions: [
    { q: "風俗営業の許可はどの類型に該当するか。", options: ["認可", "許可", "特許"], answer: 1, explanation: "本来禁止されている営業を解除するため、許可。" },
    { q: "当事者の法律行為を行政が補充して完成させるものはどれか。", options: ["認可", "許可", "特許"], answer: 0, explanation: "認可は当事者の行為に行政が補充して効力を完成させる。" },
    { q: "新たに特別な権利を与える行為はどれか。", options: ["許可", "認可", "特許"], answer: 2, explanation: "ゼロから権利や地位を与えるため、特許。" },
    { q: "禁止解除という言葉と最も結びつくものはどれか。", options: ["許可", "特許", "認可"], answer: 0, explanation: "禁止されている状態を解除するのが許可。" },
    { q: "公物を独占的に使用する権利の付与は、基本的にどれに近いか。", options: ["認可", "特許", "許可"], answer: 1, explanation: "公物の特別使用権を新たに与えるため、特許に近い。" }
  ],
  coachNote: "今日は、許可・認可・特許を『元の状態』で判定する。"
};
