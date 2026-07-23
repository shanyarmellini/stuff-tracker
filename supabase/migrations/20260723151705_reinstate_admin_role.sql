-- Reinstate admin role for the owner account via app_metadata
-- app_metadata is server-controlled and safe for authorization decisions
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
where email = 'shany.armellini@gmail.com';
