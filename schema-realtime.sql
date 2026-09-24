-- schema.sql allaqachon Run qilingan bo'lsa, shu qismini SQL Editor da alohida Run qiling.

alter table public.profiles replica identity full;
alter table public.orders replica identity full;
alter table public.candidates replica identity full;
alter table public.deleted_orders replica identity full;
alter table public.deleted_candidates replica identity full;

do $$ begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.candidates; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.deleted_orders; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.deleted_candidates; exception when duplicate_object then null; end $$;
