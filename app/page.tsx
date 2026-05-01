"use client";

import { useEffect, useMemo, useState } from "react";

type Question = { q: string; options: string[]; answer: number; explanation: string };
type Lesson = {
  lessonId: string;
  subject: string;
  title: string;
  levelBand: string;
  summary: string[];
  keywords: string[];
  questions: Question[];
  coachNote?: string;
};
type Session = { lessonId: string; subject: string; score: number; correct: number; exp: number; date: string };
type Profile = { exp: number; sessions: Session[]; weak: Record<string, number>; lastLessonId?: string };

const STORAGE_KEY = "gyoseishoshi_quest_profile_v3";

const levels = [
  { min: 0, level: 1, label: "用語理解" },
  { min: 100, level: 2, label: "用語理解" },
  { min: 220, level: 3, label: "用語理解" },
  { min: 360, level: 4, label: "条文理解" },
  { min: 530, level: 5, label: "条文理解" },
  { min: 730, level: 6, label: "条文理解" },
  { min: 980, level: 7, label: "判例思考" },
  { min: 1280, level: 8, label: "判例思考" },
  { min: 1650, level: 9, label: "判例思考" },
  { min: 2100, level: 10, label: "本試験レベル" },
];

function getLevel(exp: number) {
  return levels.reduce((acc, item) => (exp >= item.min ? item : acc), levels[0]);
}

function getNextLevel(exp: number) {
  return levels.find((item) => item.min > exp) || levels[levels.length - 1];
}

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { exp: 0, sessions: [], weak: {} };
    return JSON.parse(raw);
  } catch {
    return { exp: 0, sessions: [], weak: {} };
  }
}

export default function Home() {
  const [profile, setProfile] = useState<Profile>({ exp: 0, sessions: [], weak: {} });
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setProfile(loadProfile()), []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const level = useMemo(() => getLevel(profile.exp), [profile.exp]);
  const nextLevel = useMemo(() => getNextLevel(profile.exp), [profile.exp]);
  const progress =
    nextLevel.min === level.min
      ? 100
      : Math.round(((profile.exp - level.min) / (nextLevel.min - level.min)) * 100);

  const result = useMemo(() => {
    if (!lesson) return { correct: 0, score: 0, gainedExp: 0, bonus: 0 };
    const correct = lesson.questions.reduce(
      (sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0),
      0
    );
    const score = correct * 20;
    const bonus = correct === 5 ? 50 : 0;
    return { correct, score, bonus, gainedExp: correct * 20 + bonus };
  }, [lesson, answers]);

  async function generateLesson(nextProfile: Profile, mode: "start" | "next" = "start") {
    setLoading(true);
    setMessage(mode === "next" ? "次の問題を生成しています。" : "問題を生成しています。");
    setSubmitted(false);
    setAnswers({});

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: nextProfile,
          requestId: `${Date.now()}-${Math.random()}`,
          avoidLessonId: nextProfile.lastLessonId || null,
        }),
      });

      const data = await res.json();

      if (!data.lesson) {
        throw new Error("lesson not found");
      }

      setLesson(data.lesson);
      setMessage(
        data.source === "openai"
          ? "AI生成で開始します。"
          : "APIキー未設定または失敗のため、内蔵問題で開始します。"
      );
    } catch {
      setMessage("生成に失敗しました。もう一度押してください。");
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    await generateLesson(profile, "start");
  }

  function submit() {
    if (!lesson || Object.keys(answers).length < 5) return;

    const weakAdd = result.score < 80 ? 1 : 0;

    const nextProfile: Profile = {
      exp: profile.exp + result.gainedExp,
      weak: {
        ...profile.weak,
        [lesson.subject]: (profile.weak[lesson.subject] || 0) + weakAdd,
      },
      sessions: [
        ...profile.sessions,
        {
          lessonId: lesson.lessonId,
          subject: lesson.subject,
          score: result.score,
          correct: result.correct,
          exp: result.gainedExp,
          date: new Date().toISOString(),
        },
      ],
      lastLessonId: lesson.lessonId,
    };

    setProfile(nextProfile);
    setSubmitted(true);
  }

  async function nextLesson() {
    await generateLesson(profile, "next");
  }

  function reset() {
    const fresh: Profile = { exp: 0, sessions: [], weak: {} };
    setProfile(fresh);
    setLesson(null);
    setAnswers({});
    setSubmitted(false);
    setMessage("リセットしました。");
  }

  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <p className="eyebrow">行政書士試験 学習ゲーム</p>
          <h1>行政書士クエスト</h1>
          <p className="lead">開始 → インプット → クリック回答 → 採点 → 成長分析</p>
        </div>
        <div className="actions">
          <button className="primary" onClick={start} disabled={loading}>
            {loading ? "生成中" : "開始"}
          </button>
          <button className="secondary" onClick={reset}>
            リセット
          </button>
        </div>
      </section>

      <section className="stats">
        <div className="card">
          <span>現在Lv</span>
          <strong>Lv{level.level}</strong>
          <small>{level.label}</small>
        </div>
        <div className="card">
          <span>EXP</span>
          <strong>{profile.exp}</strong>
          <div className="bar">
            <i style={{ width: `${progress}%` }} />
          </div>
          <small>次Lvまで {Math.max(0, nextLevel.min - profile.exp)} EXP</small>
        </div>
        <div className="card">
          <span>学習回数</span>
          <strong>{profile.sessions.length}</strong>
          <small>60%以上で維持 / 80%以上で成長</small>
        </div>
      </section>

      {message && <p className="message">{message}</p>}

      {!lesson && (
        <section className="empty">
          <h2>「開始」で今日の範囲を自動生成</h2>
          <p>AIが過去成績を見て、分野と難易度を決めます。</p>
        </section>
      )}

      {lesson && (
        <section className="lesson">
          <div className="card lessonHead">
            <div className="badges">
              <b>{lesson.subject}</b>
              <b>{lesson.levelBand}</b>
            </div>
            <h2>今日の範囲：{lesson.title}</h2>
            <p className="coach">{lesson.coachNote}</p>
            <div className="grid2">
              <div>
                <h3>要点まとめ</h3>
                {lesson.summary.map((s, i) => (
                  <p key={i}>・{s}</p>
                ))}
              </div>
              <div>
                <h3>重要キーワード</h3>
                <div className="chips">
                  {lesson.keywords.map((k) => (
                    <span key={k}>{k}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {lesson.questions.map((q, qi) => (
            <div className="card question" key={`${lesson.lessonId}-${qi}`}>
              <h3>
                Q{qi + 1}. {q.q}
              </h3>
              <div className="options">
                {q.options.map((op, oi) => {
                  const selected = answers[qi] === oi;
                  const correct = submitted && q.answer === oi;
                  const wrong = submitted && selected && q.answer !== oi;
                  return (
                    <button
                      key={op}
                      disabled={submitted}
                      onClick={() => setAnswers({ ...answers, [qi]: oi })}
                      className={`${selected ? "selected" : ""} ${correct ? "correct" : ""} ${
                        wrong ? "wrong" : ""
                      }`}
                    >
                      <b>{String.fromCharCode(65 + oi)}.</b> {op}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="explain">
                  {answers[qi] === q.answer
                    ? "正解"
                    : `不正解：正解は${String.fromCharCode(65 + q.answer)}`}
                  。{q.explanation}
                </p>
              )}
            </div>
          ))}

          {!submitted ? (
            <button
              className="primary submit"
              disabled={Object.keys(answers).length < 5 || loading}
              onClick={submit}
            >
              採点する
            </button>
          ) : (
            <div className="card result">
              <h2>結果：{result.score}点</h2>
              <p>
                {result.correct}/5問正解・EXP +{result.gainedExp}
                {result.bonus ? "（全問正解ボーナス含む）" : ""}
              </p>
              <div className="grid2">
                <div>
                  <h3>弱点分析</h3>
                  <p>
                    {result.score >= 80
                      ? "この範囲は安定。次は少し難度を上げる。"
                      : result.score >= 60
                      ? "基本は取れているが、判断の迷いが残る。"
                      : "用語理解をもう一度固める。"}
                  </p>
                </div>
                <div>
                  <h3>次の課題</h3>
                  <p>
                    {result.score >= 80
                      ? "次回は別分野または条文寄りへ進む。"
                      : "次回は同範囲のひっかけ問題で復習。"}
                  </p>
                </div>
              </div>
              <button className="primary" onClick={nextLesson} disabled={loading}>
                {loading ? "生成中" : "次へ"}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
