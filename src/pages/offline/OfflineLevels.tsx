import React from 'react';
import { LevelsRoadmap } from '../../components/curriculum/LevelsRoadmap';

/** 12-level roadmap (offline / campus portal); lock states come from Supabase. */
export const OfflineLevels: React.FC = () => <LevelsRoadmap mode="offline" />;
