import React from 'react';
import { ModulesRoadmap } from '../../components/curriculum/ModulesRoadmap';

/** 12-module roadmap (offline / campus portal); lock states come from Supabase. */
export const OfflineModules: React.FC = () => <ModulesRoadmap mode="offline" />;
