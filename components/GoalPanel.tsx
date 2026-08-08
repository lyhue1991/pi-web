"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ExtensionWidgetItem } from "@/lib/types";

interface GoalData {
  objective: string;
  status: string;
  statusLabel: string;
  timeUsedSeconds: number;
  timeLabel: string;
  tokensUsed: number;
  tokenBudget: number | null;
  budgetLabel: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  paused: "#d97706",
  blocked: "#ea580c",
  usage_limited: "#ef4444",
  budget_limited: "#ef4444",
  complete: "#6b7280",
};

const RESUMABLE = new Set(["paused", "blocked", "usage_limited", "budget_limited"]);

function parseGoalData(widget: ExtensionWidgetItem): GoalData | null {
  const raw = widget.lines?.[0];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GoalData;
    if (typeof parsed.objective !== "string" || typeof parsed.status !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function GoalPanel({
  widget,
  onAction,
  onEditSubmit,
}: {
  widget: ExtensionWidgetItem | undefined;
  onAction: (subcommand: string) => void;
  onEditSubmit: (newObjective: string) => void;
}) {
  const goal = useMemo(() => (widget ? parseGoalData(widget) : null), [widget]);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  if (!goal) return null;

  const dotColor = STATUS_COLORS[goal.status] ?? "var(--text-muted)";
  const canPause = goal.status === "active";
  const canResume = RESUMABLE.has(goal.status);

  const startEdit = () => {
    setDraft(goal.objective);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft("");
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === goal.objective) {
      cancelEdit();
      return;
    }
    onEditSubmit(trimmed);
    setIsEditing(false);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const btn = (label: string, onClick: () => void, primary: boolean) => (
    <button
      onClick={onClick}
      style={{
        padding: "3px 9px",
        borderRadius: 5,
        border: `1px solid ${primary ? "var(--accent)" : "var(--border)"}`,
        background: primary ? "var(--accent)" : "var(--bg)",
        color: primary ? "#fff" : "var(--text-muted)",
        cursor: "pointer",
        fontSize: 12,
        lineHeight: 1.4,
        fontFamily: "var(--font-mono)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 10px",
        marginBottom: 8,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--bg-panel)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          title={goal.statusLabel}
          style={{
            flexShrink: 0,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
          }}
        />
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: dotColor,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {goal.statusLabel}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--text-dim)",
            whiteSpace: "nowrap",
            textAlign: "right",
          }}
        >
          {goal.timeLabel} · {goal.budgetLabel}t
        </span>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {canPause && btn("Pause", () => onAction("pause"), false)}
          {canResume && btn("Resume", () => onAction("resume"), true)}
          {!isEditing && btn("Edit", startEdit, false)}
          {btn("Clear", () => onAction("clear"), false)}
        </div>
      </div>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--accent)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.5,
              fontFamily: "var(--font-sans)",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {btn("Cancel", cancelEdit, false)}
            {btn("Save", saveEdit, true)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            Cmd+Enter to save · Esc to cancel
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: 13,
            color: "var(--text)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {goal.objective}
        </div>
      )}
    </div>
  );
}
