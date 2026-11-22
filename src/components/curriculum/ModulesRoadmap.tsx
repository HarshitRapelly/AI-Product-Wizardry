import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { activeModuleLabel, isModuleReleased, lockReasonOf, moduleNumberOf, moduleStateOf, rowsOf } from '../../lib/moduleStatus';
import { useCurriculumModule } from '../../hooks/useCurriculumModule';
import { MODULE_TITLES } from '../../config/program';
import { Icon } from '../aiw/Icon';

/** module_id of "Module 0" (1-based in the database: module_id = number + 1). */
const MODULE0 = 1;

/** The real Module 0 lessons (reading + quiz) with the student's state (from Supabase). */
const Module0Lessons: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { state } = useCurriculumModule(MODULE0);
  if (state.status === 'loading') return <div className="empty" role="status"><span className="spinner" aria-hidden="true" /> Loading Module 0 lessons…</div>;
  if (state.status !== 'ready') return <div className="empty">{state.status === 'error' ? state.message : 'Module 0 content is not available yet.'}</div>;
  return (
    <ol className="lessons" data-testid="modules-l0-subtopics" style={{ listStyle: 'none' }}>
      {state.lessons.map((st) => (
        <li key={st.key} data-lesson={st.key} data-kind={st.kind} data-state={st.state}>
          <Link
            to={`/${mode}/module/0?lesson=${encodeURIComponent(st.key)}`}
            data-testid="modules-subtopic-link"
            className={`lsn${st.state === 'done' ? ' dn' : st.state === 'locked' ? ' lk' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <span className="lic" aria-hidden="true"><Icon name={st.state === 'done' ? 'check' : st.kind === 'quiz' ? 'quiz' : 'doc'} size={20} /></span>
            <span>
              <h4>{st.number}. {st.title}{st.kind === 'quiz' ? ` · ${st.status.subtopic.title}` : ''}</h4>
              <p>Topic {st.status.subtopic.topicNumber} · {st.status.subtopic.topicTitle}</p>
            </span>
            <span className={`tag ${st.state === 'done' ? 'ok' : st.state === 'locked' ? 'lock' : 'live'}`}>
              {st.state === 'done' ? 'Completed' : st.state === 'locked' ? 'Locked' : 'Up next'}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
};

/**
 * The 12-module roadmap for both portals. Lock / complete states come from
 * my_module_progress() and the release lock only; Module 0 lists its real lessons.
 */
export const ModulesRoadmap: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { moduleProgress } = useAuthAndCourse();
  const rows = rowsOf(moduleProgress);
  const loading = moduleProgress.status === 'loading';

  return (
    <PortalLayout mode={mode} title="Modules">
      <div className="ttl">
        <p className="eyebrow gold">Modules</p>
        <h1>Twelve modules, Module 0 to Module 11</h1>
        <p>
          {moduleProgress.status === 'ready' ? `You are in ${activeModuleLabel(moduleProgress).replace(' Active', '')}. ` : ''}
          Modules open in order, as the program team releases them.
        </p>
      </div>
      {moduleProgress.status === 'error' && (
        <div className="note err" role="alert" style={{ marginBottom: 18 }}><Icon name="alert" size={18} /><span>{moduleProgress.message}</span></div>
      )}
      <ol className="modlist" data-testid="modules-list" aria-label="Modules 0 to 11">
        {MODULE_TITLES.map((title, n) => {
          const id = n + 1;
          const st = moduleStateOf(moduleProgress, id);
          const reason = lockReasonOf(moduleProgress, id);
          const row = rows.find((r) => r.moduleId === id);
          const pct = row ? Math.round(row.completionFraction * 100) : 0;
          const openable = st !== 'locked' && n <= 1;
          const status = st === 'complete' ? 'Complete' : st === 'active' ? 'Open' : reason === 'not_released' ? 'Not released yet' : 'Locked';
          const body = (
            <>
              <span className="mnum" aria-hidden="true">{n}</span>
              <span className="mmain">
                <span className="eyebrow" style={{ fontSize: 11 }}>Module {moduleNumberOf(id)}</span>
                <span className="mtitle">{title}</span>
                <span className="mdesc">
                  {st === 'locked'
                    ? reason === 'not_released' ? 'Opens when the program team releases it.' : `Complete Module ${n - 1} first.`
                    : row && row.totalItems > 0 ? `${row.completedItems} of ${row.totalItems} subtopics done` : 'Content coming soon.'}
                </span>
                {st !== 'locked' && row && row.totalItems > 0 && (
                  <span className="prog t" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Module ${n} progress`} style={{ display: 'block', marginTop: 8, maxWidth: 420 }}>
                    <i style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>
              <span className="mside">
                <span className={`tag ${st === 'complete' ? 'ok' : st === 'active' ? 'live' : 'lock'}`}>
                  {st === 'locked' && <Icon name="lock" size={11} />}{status}
                </span>
                {st !== 'locked' && row && row.totalItems > 0 && <b className="mpct">{pct}%</b>}
                {openable && <span className="mgo" aria-hidden="true"><Icon name="right" size={18} /></span>}
              </span>
            </>
          );
          return (
            <li key={id}>
              {openable ? (
                <Link to={`/${mode}/module/${n}`} className={`mrow ${st}`} data-module-node={id} data-state={st} aria-label={`Module ${n}: ${title}. ${status}${row && row.totalItems > 0 ? `, ${pct}% complete` : ''}`}>{body}</Link>
              ) : (
                <div className={`mrow ${st}`} data-module-node={id} data-state={st} aria-disabled={st === 'locked'}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      {loading && <p className="muted" role="status" style={{ marginTop: 12, color: 'rgba(250,247,242,.7)' }}>Loading your progress…</p>}

      {isModuleReleased(MODULE0) && (
        <section className="panel" style={{ marginTop: 22 }} aria-labelledby="m0-title">
          <div className="phead">
            <h2 id="m0-title">Module 0 lessons</h2>
            <Link className="more" to={`/${mode}/module/0`}>Open Module 0 →</Link>
          </div>
          <Module0Lessons mode={mode} />
        </section>
      )}
    </PortalLayout>
  );
};
