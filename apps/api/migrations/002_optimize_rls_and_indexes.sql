-- Performance hardening identified by the Supabase database advisor.
-- Keeps RLS semantics unchanged while evaluating auth.uid() once per statement.

create index if not exists favorites_scan_id_idx
  on public.favorites (scan_id);
create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id);

alter policy "Users can read their own scans"
  on public.scans
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their own scans"
  on public.scans
  with check ((select auth.uid()) = user_id);

alter policy "Users can update their own scans"
  on public.scans
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users can delete their own scans"
  on public.scans
  using ((select auth.uid()) = user_id);

alter policy "Users can read their own favorites"
  on public.favorites
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their own favorites"
  on public.favorites
  with check ((select auth.uid()) = user_id);

alter policy "Users can delete their own favorites"
  on public.favorites
  using ((select auth.uid()) = user_id);

alter policy "Users can read their own chat messages"
  on public.chat_messages
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their own chat messages"
  on public.chat_messages
  with check ((select auth.uid()) = user_id);
