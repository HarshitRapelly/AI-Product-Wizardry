-- =============================================================================
-- 20261121000200 (offline-only registration) — READ-ONLY verification
-- (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: m0200_* columns false. After: every *_ok
-- column true and every snapshot_* value IDENTICAL (the migration changes no row:
-- existing online / offline modes and slot / device values are preserved).
-- Nothing is written, no role is switched; aggregates and fingerprints only.
-- =============================================================================
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations'
      and column_name in ('preferred_slot', 'main_device') and is_nullable = 'YES') = 2              as m0200_slot_device_nullable_ok,
  coalesce((select p.prosrc like '%v_mode <> ''offline''%'
                and p.prosrc like '%v_slot is not null and v_slot not in%'
                and p.prosrc like '%v_device is not null and v_device not in%'
              from pg_proc p where p.oid = to_regprocedure('private.normalize_registration(jsonb)')), false) as m0200_normalize_ok,
  exists (select 1 from pg_trigger t
           where t.tgrelid = to_regclass('public.profiles') and t.tgname = 'profiles_learning_mode_guard'
             and not t.tgisinternal and t.tgenabled = 'O'
             and t.tgfoid = to_regprocedure('private.profiles_learning_mode_guard()'))                 as m0200_mode_guard_trigger_ok,
  coalesce((select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p
             where p.oid = to_regprocedure('private.profiles_learning_mode_guard()')), false)           as m0200_mode_guard_definer_ok,
  -- Unchanged security properties (true before AND after)
  has_column_privilege('authenticated', 'public.profiles', 'learning_mode', 'update')                 as learning_mode_grant_kept_ok,
  not has_table_privilege('authenticated', 'public.student_registrations', 'update')
    and not has_table_privilege('authenticated', 'public.student_registrations', 'insert')
    and not has_table_privilege('anon', 'public.student_registrations', 'select')                     as registrations_not_writable_ok,
  not has_function_privilege('authenticated', 'private.normalize_registration(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'private.apply_registration(uuid,jsonb,text)', 'execute')
    and (to_regprocedure('private.profiles_learning_mode_guard()') is null
         or not has_function_privilege('authenticated', 'private.profiles_learning_mode_guard()', 'execute'))
                                                                                                        as private_functions_closed_ok,
  -- Snapshot (must be identical before and after)
  (select count(*) from public.profiles where learning_mode = 'online')                                as snapshot_profiles_online,
  (select count(*) from public.profiles where learning_mode = 'offline')                               as snapshot_profiles_offline,
  (select count(*) from public.profiles where learning_mode is null)                                   as snapshot_profiles_no_mode,
  (select count(*) from public.student_registrations)                                                  as snapshot_registrations,
  (select count(*) from public.student_registrations where learning_mode = 'online')                   as snapshot_registrations_online,
  (select count(*) from public.student_registrations where preferred_slot is null or main_device is null) as snapshot_registrations_without_slot_or_device,
  (select md5(coalesce(string_agg(id || ':' || coalesce(learning_mode, '-'), ',' order by id), '')) from public.profiles)
                                                                                                        as snapshot_profile_modes_md5,
  (select md5(coalesce(string_agg(user_id || ':' || coalesce(learning_mode, '-') || ':' || coalesce(preferred_slot, '-')
                                  || ':' || coalesce(main_device, '-'), ',' order by user_id), ''))
     from public.student_registrations)                                                                as snapshot_registration_modes_md5;
