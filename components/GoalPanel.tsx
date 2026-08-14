"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ExtensionWidgetItem } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";

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
  const { t } = useI18n();
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

  const iconBtn = (
    title: string,
    onClick: () => void,
    primary: boolean,
    icon: React.ReactNode,
  ) => (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        padding: 0,
        borderRadius: 5,
        border: `1px solid ${primary ? "var(--accent)" : "var(--border)"}`,
        background: primary ? "var(--accent)" : "var(--bg)",
        color: primary ? "#fff" : "var(--text-muted)",
        cursor: "pointer",
        transition: "background 0.12s, color 0.12s, border-color 0.12s",
      }}
      onMouseEnter={(e) => {
        if (!primary) {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!primary) {
          e.currentTarget.style.background = "var(--bg)";
          e.currentTarget.style.color = "var(--text-muted)";
        }
      }}
    >
      {icon}
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
          {canPause &&
            iconBtn(
              t("goal.pause"),
              () => onAction("pause"),
              false,
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>,
            )}
          {canResume &&
            iconBtn(
              t("goal.resume"),
              () => onAction("resume"),
              true,
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 4l14 8-14 8V4z" />
              </svg>,
            )}
          {!isEditing &&
            iconBtn(
              t("goal.edit"),
              startEdit,
              false,
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>,
            )}
          {iconBtn(
            t("goal.clear"),
            () => onAction("clear"),
            false,
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>,
          )}
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
            {btn(t("i18n.cancel"), cancelEdit, false)}
            {btn(t("i18n.save"), saveEdit, true)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            {t("goal.editHint")}
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
