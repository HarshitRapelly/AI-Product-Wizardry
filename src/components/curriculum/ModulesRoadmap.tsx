import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { activeModuleLabel, lockReasonOf, moduleNumberOf, moduleStateOf, rowsOf } from '../../lib/moduleStatus';
import { MODULE_TITLES } from '../../config/program';
import { Icon } from '../aiw/Icon';

/**
 * The 12-module roadmap for both portals. Lock / complete states come from
 * my_module_progress() and the release lock only. (The separate Module 0 lesson list was removed;
 * each module card opens its lessons.)
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

    </PortalLayout>
  );
};
