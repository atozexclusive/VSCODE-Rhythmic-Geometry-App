alter table public.users
add column if not exists access_source text not null default 'none'
check (access_source in ('beta', 'comped', 'paid', 'none'));

update public.users
set access_source = case
  when comped = true then 'comped'
  else 'none'
end
where access_source is null or access_source = '';
