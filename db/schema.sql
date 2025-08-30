-- Function to delete user from auth.users and all their data
create or replace function delete_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Delete share links associated with the user's boards, folders, and links
  delete from public.share_links where resource_id in (select id from public.boards where user_id = old.id);
  delete from public.share_links where resource_id in (select id from public.folders where board_id in (select id from public.boards where user_id = old.id));
  delete from public.share_links where resource_id in (select id from public.links where folder_id in (select id from public.folders where board_id in (select id from public.boards where user_id = old.id)));

  -- Delete links
  delete from public.links where folder_id in (select id from public.folders where board_id in (select id from public.boards where user_id = old.id));

  -- Delete folders
  delete from public.folders where board_id in (select id from public.boards where user_id = old.id);

  -- Delete boards
  delete from public.boards where user_id = old.id;

  -- Delete user from auth.users
  delete from auth.users where id = old.id;
  
  return old;
end;
$$;

-- Trigger to call the function when a user is deleted
create or replace trigger on_public_user_deleted
  after delete on public.users
  for each row
  execute procedure delete_auth_user();