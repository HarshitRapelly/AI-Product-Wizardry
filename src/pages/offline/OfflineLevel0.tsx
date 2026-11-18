import React from 'react';
import { Level0HubPage } from '../../components/curriculum/Level0HubPage';

/** Level 0 (offline / campus portal): the same shared Supabase-backed curriculum hub. */
export const OfflineLevel0: React.FC = () => <Level0HubPage mode="offline" />;
