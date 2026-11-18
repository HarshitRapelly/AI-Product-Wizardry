import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { acknowledgeSubtopic, confirmReadingModule, fetchMyLessonProgress, fetchSubtopics, type CurriculumError } from '../services/curriculumService';
import { fetchMyAttempts } from '../services/quizService';
import { computeSubtopicStatuses, type SubtopicStatus } from '../lib/curriculumRules';
import { computeModules, readingLessonId, type LevelModule } from '../lib/levelModules';
import type { CourseSubtopic, LessonProgressRow, QuizAttemptSummary } from '../lib/curriculumTypes';

export type CurriculumLevelState =
  | { status: 'loading' }
  | { status: 'ready'; subtopics: CourseSubtopic[]; progress: LessonProgressRow[]; attempts: QuizAttemptSummary[]; statuses: SubtopicStatus[]; modules: LevelModule[] }
  /** The level has no published content. */
  | { status: 'empty' }
  /** Curriculum tables / functions are not deployed yet (Migrations 9–10). */
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export type AckState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; error: CurriculumError };

/** Errors that mean this tab's view is out of date: reload from the server. */
const STALE_KINDS = new Set(['order', 'quiz_required', 'reading_required', 'level_locked', 'undo']);

/**
 * Loads one level's subtopics plus the signed-in student's progress and quiz
 * attempts (all from Supabase, in parallel) and performs the level's writes.
 * Responses for a previous student or an older request are ignored.
 */
export function useCurriculumLevel(levelId: number) {
  const { user, refreshProgress } = useAuthAndCourse();
  const uid = user?.id ?? null;
  const [data, setData] = useState<{ subtopics: CourseSubtopic[]; progress: LessonProgressRow[]; attempts: QuizAttemptSummary[] } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'unavailable' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [ack, setAck] = useState<Record<string, AckState>>({});
  const inFlight = useRef(new Set<string>());
  const dataRef = useRef(data);
  dataRef.current = data;
  const req = useRef(0);

  const load = useCallback(async (opts: { quiet?: boolean } = {}) => {
    const my = ++req.current;
    if (!uid) { setState('loading'); setData(null); return; }
    if (!opts.quiet) setState('loading');
    const subs = await fetchSubtopics(levelId);
    if (my !== req.current) return;
    if (!subs.ok) {
      if (opts.quiet) return; // keep what is on screen; a later reload will retry
      setData(null);
      if (subs.error.kind === 'unavailable') setState('unavailable');
      else { setMessage(subs.error.message); setState('error'); }
      return;
    }
    if (!subs.value.length) { setData(null); setState('empty'); return; }
    const quizIds = [...new Set(subs.value.map((s) => s.quizId).filter((q): q is string => !!q))];
    const [prog, atts] = await Promise.all([fetchMyLessonProgress(levelId), fetchMyAttempts(quizIds)]);
    if (my !== req.current) return;
    const failed = !prog.ok ? prog.error : !atts.ok ? atts.error : null;
    if (failed) {
      if (opts.quiet) return;
      setData(null);
      if (failed.kind === 'unavailable') setState('unavailable');
      else { setMessage(failed.message); setState('error'); }
      return;
    }
    setData({ subtopics: subs.value, progress: prog.ok ? prog.value : [], attempts: atts.ok ? atts.value : [] });
    setState('ready');
  }, [levelId, uid]);

  useEffect(() => {
    setData(null);
    setAck({});
    inFlight.current.clear();
    void load();
    return () => { req.current++; };
  }, [load]);

  /** Merge a progress row returned by the server (never downgrades a confirmation). */
  const mergeProgress = useCallback((row: LessonProgressRow) => {
    setData((d) => {
      if (!d) return d;
      const prev = d.progress.find((p) => p.lessonId === row.lessonId);
      const merged = prev ? { ...prev, ...row, isCompleted: prev.isCompleted || row.isCompleted, completedAt: row.completedAt ?? prev.completedAt } : row;
      return { ...d, progress: [...d.progress.filter((p) => p.lessonId !== row.lessonId), merged] };
    });
  }, []);

  /** Remember a saved reading position locally (keeps the row's confirmation). */
  const notePosition = useCallback((lessonId: string, sectionId: string) => {
    setData((d) => {
      if (!d) return d;
      const prev = d.progress.find((p) => p.lessonId === lessonId);
      const row: LessonProgressRow = prev ? { ...prev, lastSectionId: sectionId } : { lessonId, levelId, isCompleted: false, completedAt: null, lastSectionId: sectionId };
      return { ...d, progress: [...d.progress.filter((p) => p.lessonId !== lessonId), row] };
    });
  }, [levelId]);

  /**
   * Confirms a subtopic. One request at a time per subtopic (double clicks are
   * ignored). Network failures can simply be retried: the write is an upsert.
   */
  const acknowledge = useCallback(async (s: CourseSubtopic) => {
    if (inFlight.current.has(s.id)) return;
    inFlight.current.add(s.id);
    setAck((a) => ({ ...a, [s.id]: { status: 'pending' } }));
    const my = req.current;
    const r = await acknowledgeSubtopic(s);
    inFlight.current.delete(s.id);
    if (my !== req.current) return; // student changed meanwhile
    if (r.ok) {
      mergeProgress(r.value);
      setAck((a) => ({ ...a, [s.id]: { status: 'idle' } }));
      void refreshProgress();
    } else {
      setAck((a) => ({ ...a, [s.id]: { status: 'error', error: r.error } }));
      if (STALE_KINDS.has(r.error.kind)) void load({ quiet: true }); // this tab was out of date
    }
  }, [mergeProgress, refreshProgress, load]);

  /**
   * Confirms the reading module of a subtopic that has a quiz (server row
   * `<id>-reading`). If a quiz attempt already exists (e.g. a student who took the
   * quiz before modules were split), the subtopic acknowledgment is recorded too.
   * Ack state is reported under the reading row id.
   */
  const confirmReading = useCallback(async (s: CourseSubtopic) => {
    const rid = readingLessonId(s.id);
    if (inFlight.current.has(rid)) return;
    inFlight.current.add(rid);
    setAck((a) => ({ ...a, [rid]: { status: 'pending' } }));
    const my = req.current;
    const r = await confirmReadingModule(s.levelId, rid);
    inFlight.current.delete(rid);
    if (my !== req.current) return;
    if (!r.ok) {
      setAck((a) => ({ ...a, [rid]: { status: 'error', error: r.error } }));
      if (STALE_KINDS.has(r.error.kind)) void load({ quiet: true });
      return;
    }
    mergeProgress(r.value);
    setAck((a) => ({ ...a, [rid]: { status: 'idle' } }));
    const d = dataRef.current;
    const attempted = !!s.quizId && !!d?.attempts.some((a) => a.quizId === s.quizId);
    const acknowledged = !!d?.progress.some((p) => p.lessonId === s.id && p.isCompleted);
    if (attempted && !acknowledged) await acknowledge(s);
  }, [mergeProgress, load, acknowledge]);

  /** A successful quiz submission (new attempt, or the same one returned on retry). */
  const recordAttempt = useCallback((a: QuizAttemptSummary) => {
    setData((d) => (d ? { ...d, attempts: [...d.attempts.filter((x) => x.id !== a.id), a].sort((x, y) => x.attemptNumber - y.attemptNumber) } : d));
    void refreshProgress();
  }, [refreshProgress]);

  const value: CurriculumLevelState = useMemo(() => {
    if (state === 'ready' && data) {
      const statuses = computeSubtopicStatuses(data.subtopics, data.progress, data.attempts);
      return { status: 'ready', ...data, statuses, modules: computeModules(statuses, data.progress) };
    }
    if (state === 'error') return { status: 'error', message };
    if (state === 'empty' || state === 'unavailable') return { status: state };
    return { status: 'loading' };
  }, [state, data, message]);

  return { state: value, reload: load, acknowledge, confirmReading, ackState: ack, recordAttempt, notePosition };
}
