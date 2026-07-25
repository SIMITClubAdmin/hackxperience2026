"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShellConfig, type AdminMetric } from "../components/AdminShell";
import type { AdminSubmission, SubmissionScore } from "@/lib/types";
import { fetchAdminSubmissions, fetchAdminSettings } from "@/lib/client/admin-api";
import { criterionDisplayMaxima, parseCriterionWeights } from "@/lib/scoring";
import styles from "./Results.module.css";

type JudgeBreakdown = {
  judgeId: string;
  technicalExecution: number | null;
  problemSolutionFit: number | null;
  innovationCreativity: number | null;
  presentationQuality: number | null;
  entrepreneurship: number | null;
  overall: number;
};

// Per-criterion display max is always /100; overall is sum of weights.
type ScoreMaxima = {
  technical: number;
  problem: number;
  innovation: number;
  presentation: number;
  entrepreneurship: number;
  overall: number;
};

const DEFAULT_MAXIMA: ScoreMaxima = criterionDisplayMaxima();

/** "given/max" — e.g. 72/100; shows "—/100" when the criterion wasn't scored. */
function fmtScore(value: number | null, max: number): string {
  return `${typeof value === "number" ? value : "—"}/${max}`;
}

type ProjectRow = {
  id: string;
  projectName: string;
  teamName: string;
  teamId: string;
  track: string;
  aveScore: number;
  breakdowns: JudgeBreakdown[];
};

function trackTone(track: string): "care" | "friction" | "other" {
  const normalized = track.trim().toLowerCase();
  if (normalized.includes("care")) return "care";
  if (normalized.includes("friction")) return "friction";
  return "other";
}

function TrackPill({ track }: { track: string }) {
  const tone = trackTone(track);
  const label =
    tone === "care" ? "Care" : tone === "friction" ? "Friction" : track.trim() || "Track";
  const pillClass =
    tone === "care"
      ? styles.trackPillCare
      : tone === "friction"
        ? styles.trackPillFriction
        : styles.trackPillOther;

  return (
    <span className={`${styles.trackPill} ${pillClass}`} title={track}>
      {label}
    </span>
  );
}

function buildMetrics(submissions: AdminSubmission[]): AdminMetric[] {
  const pending  = submissions.filter((s) => s.status === "pending").length;
  const approved = submissions.filter((s) => s.status === "approved").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;
  return [
    { key: "total_submissions", label: "TOTAL_SUBMISSIONS", value: String(submissions.length), helper: "received",            tone: "neutral"  },
    { key: "pending",           label: "PENDING",           value: String(pending),             helper: "awaiting review",    tone: "amber"    },
    { key: "approved",          label: "APPROVED",          value: String(approved),            helper: "cleared for showcase", tone: "emerald" },
    { key: "rejected",          label: "REJECTED",          value: String(rejected),            helper: "returned to team",   tone: "red"      },
    { key: "deadline_countdown", label: "DEADLINE_COUNTDOWN", value: "00.00.00", suffix: "s",   helper: "until close",        tone: "neutral"  },
  ];
}


function buildProjectRows(submissions: AdminSubmission[]): ProjectRow[] {
  const rows: ProjectRow[] = [];

  for (const submission of submissions) {
    const scored = submission.scores.filter(
      (s): s is SubmissionScore & { score: number } =>
        typeof s.score === "number" && Number.isFinite(s.score),
    );
    if (scored.length === 0) continue;

    const totalRaw = scored.reduce((sum, s) => sum + s.score, 0);
    // Judge totals are already weighted onto the 0–overall scale
    // (criteria entered 0–100, then × weight%).
    const aveScore = Math.round((totalRaw / scored.length) * 100) / 100;

    rows.push({
      id: submission.id,
      projectName: submission.projectName,
      teamName: submission.teamName,
      teamId: submission.teamId?.trim() ? submission.teamId : "—",
      track: submission.track?.trim() || "UNTAGGED_TRACK",
      aveScore,
      breakdowns: scored.map((s) => ({
        judgeId: s.judgeId,
        technicalExecution: s.technicalExecution ?? null,
        problemSolutionFit: s.problemSolutionFit ?? null,
        innovationCreativity: s.innovationCreativity ?? null,
        presentationQuality: s.presentationQuality ?? null,
        entrepreneurship: s.entrepreneurship ?? null,
        overall: Math.round(s.score * 100) / 100,
      })),
    });
  }

  return rows.sort((a, b) => b.aveScore - a.aveScore || a.projectName.localeCompare(b.projectName));
}

export default function ResultsClient() {
  const [data,             setData]             = useState<AdminSubmission[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [exportState, setExportState] = useState("");
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set());
  const [maxima,      setMaxima]      = useState<ScoreMaxima>(DEFAULT_MAXIMA);
  const [activeTrack, setActiveTrack] = useState("ALL");

  const shellMetrics = useMemo(() => buildMetrics(data), [data]);
  const projectRows  = useMemo(() => buildProjectRows(data), [data]);

  const tracks = useMemo(
    () => Array.from(new Set(projectRows.map((row) => row.track))).sort((a, b) => a.localeCompare(b)),
    [projectRows],
  );

  const filteredRows = useMemo(
    () =>
      activeTrack === "ALL"
        ? projectRows
        : projectRows.filter((row) => row.track === activeTrack),
    [projectRows, activeTrack],
  );

  useEffect(() => {
    if (activeTrack !== "ALL" && !tracks.includes(activeTrack)) {
      setActiveTrack("ALL");
    }
  }, [activeTrack, tracks]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [payload, settingsResult] = await Promise.all([
        fetchAdminSubmissions(),
        fetchAdminSettings().catch(() => null),
      ]);
      setData(payload.submissions);

      const s = settingsResult?.settings;
      if (s) {
        setMaxima(
          criterionDisplayMaxima(
            parseCriterionWeights({
              technical_execution_value: s.technical_execution_value,
              problem_solution_fit_value: s.problem_solution_fit_value,
              innovation_creativity_value: s.innovation_creativity_value,
              presentation_quality_value: s.presentation_quality_value,
              entrepreneurship_value: s.entrepreneurship_value,
            }),
          ),
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load aggregate scores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadResults(); }, [loadResults]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleExportXlsx() {
    if (data.length === 0) {
      setExportState("NO DATA TO EXPORT");
      return;
    }
    setExportState("GENERATING XLSX...");
    try {
      const { exportResultsXlsx } = await import("@/lib/client/export-xlsx");
      await exportResultsXlsx(data, "hackxperience-results.xlsx", maxima);
      setExportState("RESULTS XLSX READY");
    } catch {
      setExportState("EXPORT FAILED, TRY AGAIN");
    }
  }

  return (
    <>
      <AdminShellConfig value={{ metrics: shellMetrics }} />

      <header className={styles.contentHeader}>
        <div>
          <h2>&gt; AGGREGATE_SCORES</h2>
          <p>
            {error
              ? `// ${error.toUpperCase()}`
              : loading
              ? "// LOADING JUDGES SCORES"
              : "// AVE_SCORE = SUM_OF_SCORES / JUDGE_COUNT"}
          </p>
        </div>
        <button type="button" className={styles.exportButton} onClick={handleExportXlsx}>
          <Download aria-hidden="true" />
          <span>[ EXPORT RESULTS XLSX ]</span>
        </button>
      </header>

      <div className={styles.filterBar} role="group" aria-label="Filter by track">
        {(["ALL", ...tracks] as const).map((track) => {
          const active = activeTrack === track;
          return (
            <button
              key={track}
              type="button"
              className={`${styles.filterChip}${active ? ` ${styles.filterChipActive}` : ""}`}
              aria-pressed={active}
              onClick={() => setActiveTrack(track)}
            >
              {track === "ALL" ? "ALL_TRACKS" : track}
            </button>
          );
        })}
        <span className={styles.filterCount}>
          // {filteredRows.length} SCORED
        </span>
      </div>

      <section className={styles.tablePanel}>
        <div className={styles.tableGrid}>

          {/* ── Column headers ───────────────────────────── */}
          <div className={styles.tableHead}>PROJECT_NAME</div>
          <div className={styles.tableHead}>TRACK</div>
          <div className={styles.tableHead}>TEAM_ID</div>
          <div className={styles.tableHead}>TEAM_NAME</div>
          <div className={styles.tableHead}>AVE_SCORE</div>
          <div className={styles.tableHead} />

          {/* ── Body ─────────────────────────────────────── */}
          {loading ? (
            <div className={styles.emptyRow}>// LOADING...</div>
          ) : projectRows.length === 0 ? (
            <div className={styles.emptyRow}>[ NO SCORED PROJECTS YET ]</div>
          ) : filteredRows.length === 0 ? (
            <div className={styles.emptyRow}>[ NO SCORED PROJECTS FOR THIS TRACK ]</div>
          ) : (
            filteredRows.map((row) => {
              const isOpen = expanded.has(row.id);
              return (
                <div className={styles.projectGroup} key={row.id}>

                  {/* Main collapsed row */}
                  <div
                    className={styles.mainRow}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => toggleExpand(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand(row.id);
                      }
                    }}
                  >
                    <div className={`${styles.tableCell} ${styles.projectCell}`} data-label="PROJECT_NAME">
                      <span className={styles.projectName}>{row.projectName}</span>
                    </div>
                    <div className={styles.tableCell} data-label="TRACK">
                      <TrackPill track={row.track} />
                    </div>
                    <div className={`${styles.tableCell} ${styles.teamIdCell}`} data-label="TEAM_ID">
                      {row.teamId}
                    </div>
                    <div className={styles.tableCell} data-label="TEAM_NAME">
                      {row.teamName}
                    </div>
                    <div className={`${styles.tableCell} ${styles.averageCell}`} data-label="AVE_SCORE">
                      {row.aveScore.toFixed(2)}
                    </div>
                    <div className={`${styles.tableCell} ${styles.toggleCell}`}>
                      <span className={styles.expandToggle} aria-hidden="true">
                        {isOpen ? "[-]" : "[+]"}
                      </span>
                    </div>
                  </div>

                  {/* Expanded judge breakdown */}
                  {isOpen && (
                    <div className={styles.breakdownWrap}>
                      <div className={styles.breakdownGrid}>
                        <div className={styles.breakdownHeader}>
                          <span>// JUDGE_ID</span>
                          <span className={styles.breakdownNum}>INNOVATION</span>
                          <span className={styles.breakdownNum}>TECHNICAL</span>
                          <span className={styles.breakdownNum}>PROBLEM_FIT</span>
                          <span className={styles.breakdownNum}>PRESENTATION</span>
                          <span className={styles.breakdownNum}>ENTREPRENEURSHIP</span>
                          <span className={styles.breakdownNum}>OVERALL</span>
                        </div>
                        {row.breakdowns.map((bd) => (
                          <div className={styles.breakdownRow} key={bd.judgeId}>
                            <span className={styles.breakdownJudge}>
                              {bd.judgeId.toUpperCase()}
                            </span>
                            <span className={styles.breakdownNum}>{fmtScore(bd.innovationCreativity, maxima.innovation)}</span>
                            <span className={styles.breakdownNum}>{fmtScore(bd.technicalExecution, maxima.technical)}</span>
                            <span className={styles.breakdownNum}>{fmtScore(bd.problemSolutionFit, maxima.problem)}</span>
                            <span className={styles.breakdownNum}>{fmtScore(bd.presentationQuality, maxima.presentation)}</span>
                            <span className={styles.breakdownNum}>{fmtScore(bd.entrepreneurship, maxima.entrepreneurship)}</span>
                            <span className={`${styles.breakdownNum} ${styles.breakdownScore}`}>
                              {bd.overall}/{maxima.overall}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>
      </section>

      <p className={styles.exportState} aria-live="polite">{exportState}</p>
    </>
  );
}
