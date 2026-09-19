import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { IqBlock } from "../../realtime/types";
import { IQDiamond } from "../../components/primitives/IQDiamond";
import "./BaseballIQ.css";

// Rust as TEXT on the dark bar measures 3.38:1 — under the 4.5 AA floor. This
// lightened value is for the `kind` eyebrow and the answer's `unit` label only;
// raw --color-accent stays on shapes (the diamond glyph, the field border).
// Same precedent as the token pass's highlightText. Do not collapse these.
const IQ_INK_ACCENT = "#e2703f";

// The server never 4xx/5xx's an internal failure — it returns 200 with a
// placeholder so an unported client doesn't render blank. `ok: false` is the
// real contract; this is the design's copy, not the backend's placeholder text.
const IQ_ERROR = {
  headline: "Not right now",
  sub: "Baseball IQ could not answer that one. The game feed and everything else on this page are unaffected.",
};

type Phase = "idle" | "thinking" | "answered" | "error";

interface IqFact {
  label: string;
  value: string;
}

interface IqAnswer {
  ok: boolean;
  headline: string;
  unit?: string;
  sub: string;
  facts: IqFact[];
}

// Session-only conversation memory — lives for as long as the panel stays
// open (cleared on close, same lifetime as `answer`), so a follow-up like
// "wasn't he traded?" can resolve "he" against the previous turn's subject.
interface ConversationTurn {
  question: string;
  headline: string;
  sub: string;
}

async function queryBaseballIq(
  gameId: string,
  updateIndex: number,
  question: string,
  conversationHistory: ConversationTurn[],
): Promise<IqAnswer> {
  try {
    const res = await fetch("/api/iq/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, updateIndex, question, conversationHistory }),
    });
    if (!res.ok) return { ok: false, headline: "N/A", sub: "", facts: [] };
    return (await res.json()) as IqAnswer;
  } catch {
    return { ok: false, headline: "N/A", sub: "", facts: [] };
  }
}

interface BaseballIQProps {
  iq: IqBlock | undefined;
  gameId: string;
  updateIndex: number;
}

export function BaseballIQ({ iq, gameId, updateIndex }: BaseballIQProps): ReactElement {
  const candidates = iq?.candidates ?? [];
  const suggested = iq?.suggested ?? [];
  const has = candidates.length > 0;
  const best = candidates[0];

  const [asking, setAsking] = useState(false);
  const [shown, setShown] = useState(false);
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<IqAnswer | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!asking) {
      setShown(false);
      return;
    }
    const t = setTimeout(() => {
      setShown(true);
      inputRef.current?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [asking]);

  const close = useCallback((): void => {
    setAsking(false);
    setQ("");
    setPhase("idle");
    setAnswer(null);
    setConversationHistory([]);
  }, []);

  useEffect(() => {
    if (!asking) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [asking, close]);

  const ask = (text: string): void => {
    setQ(text);
    setPhase("thinking");
    setAnswer(null);
    const requestId = ++requestIdRef.current;
    void queryBaseballIq(gameId, updateIndex, text, conversationHistory).then((res) => {
      if (requestIdRef.current !== requestId) return; // a newer ask superseded this one
      setAnswer(res);
      setPhase(res.ok ? "answered" : "error");
      if (res.ok) {
        setConversationHistory((prev) => [...prev, { question: text, headline: res.headline, sub: res.sub }]);
      }
    });
  };

  return (
    <div ref={wrapRef} className="iq">
      {/* INSIGHT (rest state, something worthy). One line, ellipsised — the bar
          is 48px and stays 48px. Click reads more in the panel.
          ARRIVAL: generation is decoupled from the play push (iqUpdate), so an
          insight lands on an already-settled bar 1-2s after its play — it fades
          and settles in rather than popping, so it reads as arriving, not a glitch. */}
      {!asking && has && (
        <button
          type="button"
          className="iq-line"
          onClick={() => {
            setAsking(true);
            setPhase("idle");
          }}
        >
          <span className="iq-line__kind" style={{ color: IQ_INK_ACCENT }}>{best.kind}</span>
          <span className="iq-line__text">{best.text}</span>
        </button>
      )}

      {/* THE DIAMOND — always present, always the ask. In silence it carries the
          label so the resting state is an invitation, not an empty slot. */}
      {!asking && (
        <button type="button" className="iq-ask" aria-label="Ask Baseball IQ" onClick={() => setAsking(true)}>
          {!has && <span className="iq-ask__label">Ask Baseball IQ</span>}
          <IQDiamond />
        </button>
      )}

      {/* ASKING — field slides out right-to-left over the bar's empty middle,
          same gesture as the header search. */}
      {asking && (
        <div className={`iq-panel${shown ? " iq-panel--shown" : ""}`}>
          <div className="iq-panel__field">
            <IQDiamond size={15} />
            <input
              ref={inputRef}
              className="iq-panel__input"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (phase !== "thinking") setPhase("idle");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim() !== "") ask(q.trim());
              }}
              disabled={phase === "thinking"}
              placeholder="Ask about this game…"
            />
            <button type="button" className="iq-panel__close" aria-label="Close" onClick={close}>✕</button>
          </div>

          {/* Answer / suggestions panel — OVERLAYS the content below, never pushes. */}
          <div className="iq-panel__body">
            {phase === "thinking" ? (
              // The wait state. Same padding and first-line position as the answer,
              // so the panel does not jump when the answer lands. Not a spinner —
              // the panel is already open and already the right shape.
              <div className="iq-thinking">
                <div className="iq-thinking__row">
                  <IQDiamond size={17} pulse />
                  <span className="iq-thinking__label">Reading the game…</span>
                </div>
                <p className="iq-thinking__q">{q}</p>
              </div>
            ) : phase === "error" ? (
              // A CONTENT state, not an error dialog — the server always answers
              // 200, so this is detected on `ok: false`, never on HTTP status or
              // by sniffing headline text. No alarm colour, no icon.
              <div className="iq-error">
                <div className="iq-error__headline">{IQ_ERROR.headline}</div>
                <p className="iq-error__sub">{IQ_ERROR.sub}</p>
                <button type="button" className="iq-error__retry" onClick={() => ask(q)}>Try again</button>
              </div>
            ) : phase === "answered" && answer != null ? (
              <div className="iq-answer">
                <div className="iq-answer__head">
                  <span className="iq-answer__headline">{answer.headline}</span>
                  {answer.unit != null && answer.unit !== "" && (
                    <span className="iq-answer__unit" style={{ color: IQ_INK_ACCENT }}>{answer.unit}</span>
                  )}
                </div>
                <p className="iq-answer__sub">{answer.sub}</p>
                {answer.facts.length > 0 && (
                  <div className="iq-answer__facts">
                    {answer.facts.slice(0, 3).map((f) => (
                      <div key={f.label} className="iq-answer__fact">
                        <span className="iq-answer__fact-label">{f.label}</span>
                        <span className="iq-answer__fact-value">{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="iq-idle">
                {/* The insight the bar was showing reads in full here — the same
                    object, not a second copy of the feature. */}
                {has && (
                  <div className="iq-idle__insight">
                    <div className="iq-idle__kind" style={{ color: IQ_INK_ACCENT }}>{best.kind}</div>
                    <p className="iq-idle__text">{best.text}</p>
                  </div>
                )}
                {suggested.length > 0 ? (
                  <div className="iq-idle__label">Ask about this moment</div>
                ) : (
                  <div className="iq-idle__invite">Ask about the teams, the matchup, or anything in baseball history.</div>
                )}
                {suggested.map((s) => (
                  <button key={s} type="button" className="iq-idle__suggestion" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
