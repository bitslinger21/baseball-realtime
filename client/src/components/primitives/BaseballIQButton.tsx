import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { IQDiamond } from "./IQDiamond";
import "./BaseballIQButton.css";

// The first starter is one the live data can always answer: where the
// postseason stands in October and November, the home-run race otherwise.
const isPostseasonMonth = [9, 10].includes(new Date().getMonth());
const DEFAULT_SUGGESTED = [
  isPostseasonMonth ? "Where does the postseason stand?" : "Who leads the majors in home runs?",
  "Which teams have never won a World Series?",
  "How rare is an unassisted triple play?",
];

// The server never 4xx/5xx's an internal failure — this is the honest copy
// for "asked, but no real answer came back," same precedent as the game
// view's old band-mounted panel (PROMPT_iq_global.md retired that mount;
// this is its replacement, one level up).
const IQ_ERROR = {
  headline: "Not right now",
  sub: "Baseball IQ could not answer that one.",
};

type Phase = "idle" | "thinking" | "answered" | "error";

export interface IqAnswer {
  headline: string;
  unit?: string;
  sub: string;
}

export interface ConversationTurn {
  question: string;
  headline: string;
  sub: string;
}

export interface BaseballIQButtonProps {
  /** Scope line shown in the panel header — "what an answer here is about."
   * Omit for league-wide pages; falls back to "Anywhere in baseball." */
  context?: string;
  /** 3 starter questions specific to this page. Omit for the generic set. */
  suggested?: string[];
  /** The answer source: POST /iq/query on the game view (as of the moment on
   * screen), POST /iq/ask everywhere else (BrandHeader wires it). */
  onAsk: (question: string, history: ConversationTurn[]) => Promise<IqAnswer | null>;
}

export function BaseballIQButton({ context, suggested, onAsk }: BaseballIQButtonProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<IqAnswer | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const scope = context ?? "Anywhere in baseball";
  const qs = suggested ?? DEFAULT_SUGGESTED;

  const close = useCallback((): void => {
    setOpen(false);
    setQ("");
    setPhase("idle");
    setAnswer(null);
    setConversationHistory([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  const ask = (text: string): void => {
    setQ(text);
    setPhase("thinking");
    setAnswer(null);
    const requestId = ++requestIdRef.current;

    void onAsk(text, conversationHistory).then((res) => {
      if (requestIdRef.current !== requestId) return; // a newer ask superseded this one
      if (res == null) {
        setPhase("error");
        return;
      }
      setAnswer(res);
      setPhase("answered");
      setConversationHistory((prev) => [...prev, { question: text, headline: res.headline, sub: res.sub }]);
    });
  };

  return (
    <div ref={wrapRef} className="iqbtn">
      <button
        type="button"
        className={`iqbtn__trigger${open ? " iqbtn__trigger--open" : ""}`}
        aria-label="Ask Baseball IQ"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IQDiamond size={19} />
      </button>
      {open && (
        <div className="iqbtn__panel">
          <div className="iqbtn__panel-head">
            <IQDiamond size={14} />
            <span className="iqbtn__eyebrow">Baseball IQ</span>
            <span className="iqbtn__scope">{scope}</span>
          </div>
          <div className="iqbtn__panel-body">
            <input
              ref={inputRef}
              className="iqbtn__input"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (phase !== "thinking") setPhase("idle");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim() !== "") ask(q.trim());
              }}
              disabled={phase === "thinking"}
              placeholder="Ask about this page, or anything in baseball…"
            />
            {phase === "idle" && (
              <div className="iqbtn__suggested">
                {qs.map((x) => (
                  <button key={x} type="button" className="iqbtn__suggestion" onClick={() => ask(x)}>
                    {x}
                  </button>
                ))}
              </div>
            )}
            {phase === "thinking" && (
              <div className="iqbtn__thinking">
                <IQDiamond size={16} pulse />
                <span className="iqbtn__thinking-label">Reading the record…</span>
              </div>
            )}
            {phase === "error" && (
              <div className="iqbtn__error">
                <div className="iqbtn__error-headline">{IQ_ERROR.headline}</div>
                <p className="iqbtn__error-sub">{IQ_ERROR.sub}</p>
              </div>
            )}
            {phase === "answered" && answer != null && (
              <div className="iqbtn__answer">
                <div className="iqbtn__answer-head">
                  <span className="iqbtn__answer-headline">{answer.headline}</span>
                  {answer.unit != null && answer.unit !== "" && (
                    <span className="iqbtn__answer-unit">{answer.unit}</span>
                  )}
                </div>
                <p className="iqbtn__answer-sub">{answer.sub}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
