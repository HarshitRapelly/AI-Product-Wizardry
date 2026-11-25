import React from 'react';
import { MODULE1_ID, ModuleHubPage } from '../../components/curriculum/Module0HubPage';

/**
 * Module 1 (offline / campus portal): the shared Supabase-backed module hub, like Module 0.
 * Lessons are slide decks (20261125001700). The route wraps it in ModuleLockGate, and the database
 * serves Module 1 lessons and slides only to students for whom Module 1 is open and Module 0 complete.
 */
export const OfflineModule1: React.FC = () => <ModuleHubPage mode="offline" moduleId={MODULE1_ID} />;
