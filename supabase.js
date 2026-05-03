// ============================================================
// supabase.js  —  shared client + API helpers
// Include this script BEFORE dashboard.js / signup.js / signin.js
// Replace the two constants below with your real project values.
// ============================================================

const SUPABASE_URL  = 'https://zefwgamxzcrrqbtwnxpp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZndnYW14emNycnFidHdueHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTM3MDQsImV4cCI6MjA5MzM4OTcwNH0.kBkPy4LQFah0bRxMQffb0JVe0-66Fx3yDj48ys5ovp0';

// Lazy-load the Supabase CDN client
let _sb = null;
function sb() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _sb;
}

// ── AUTH ─────────────────────────────────────────────────────

async function signUp({ firstName, lastName, email, password, phone, role }) {
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, role, phone }
    }
  });
  if (error) throw error;

  if (data.user && phone) {
    // Wait a moment for the trigger to create the profile row
    await new Promise(r => setTimeout(r, 1000));
    await sb().from('profiles').upsert({ id: data.user.id, phone }).eq('id', data.user.id);
  }
  return data;
}

async function signIn({ email, password }) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await sb().auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const { data } = await sb().auth.getSession();
  return data.session;
}

async function getUser() {
  const { data } = await sb().auth.getUser();
  return data.user;
}

// ── PROFILE ──────────────────────────────────────────────────

async function getMyProfile() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await sb()
    .from('profiles')
    .select('*, profile_modules(module_id, modules(code))')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  // Flatten modules
  data.modules = (data.profile_modules || []).map(pm => pm.modules?.code).filter(Boolean);
  delete data.profile_modules;
  return data;
}

async function updateMyProfile(fields) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  // Recalculate avatar_initials if names change
  if (fields.first_name || fields.last_name) {
    const profile = await getMyProfile();
    const fn = fields.first_name || profile.first_name;
    const ln = fields.last_name  || profile.last_name;
    fields.avatar_initials = (fn[0] + ln[0]).toUpperCase();
  }

  const { error } = await sb()
    .from('profiles')
    .update(fields)
    .eq('id', user.id);

  if (error) throw error;
}

// ── MODULES ──────────────────────────────────────────────────

async function setMyModules(codes) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  // Upsert each module code → get ids
  const moduleIds = await Promise.all(
    codes.map(async code => {
      const { data, error } = await sb().rpc('upsert_module', { p_code: code });
      if (error) throw error;
      return data;
    })
  );

  // Delete old associations then re-insert
  await sb().from('profile_modules').delete().eq('profile_id', user.id);

  if (moduleIds.length > 0) {
    const rows = moduleIds.map(id => ({ profile_id: user.id, module_id: id }));
    const { error } = await sb().from('profile_modules').insert(rows);
    if (error) throw error;
  }
}

// ── MATCHES ──────────────────────────────────────────────────

async function getMatches() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb().rpc('get_matches', { my_id: user.id });
  if (error) throw error;
  return data;
}

// ── CONNECTIONS ──────────────────────────────────────────────

async function sendConnectionRequest(receiverId) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb()
    .from('connections')
    .insert({ sender_id: user.id, receiver_id: receiverId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function respondToRequest(connectionId, accept) {
  const { data, error } = await sb()
    .from('connections')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', connectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function withdrawRequest(connectionId) {
  const { error } = await sb()
    .from('connections')
    .delete()
    .eq('id', connectionId);

  if (error) throw error;
}

async function getIncomingRequests() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb()
    .from('connections')
    .select(`
      id, created_at, status,
      sender:profiles!connections_sender_id_fkey (
        id, first_name, last_name, role, degree, year_of_study, avatar_initials,
        profile_modules(modules(code))
      )
    `)
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    connectionId: row.id,
    createdAt: row.created_at,
    ...flattenProfile(row.sender)
  }));
}

async function getSentRequests() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb()
    .from('connections')
    .select(`
      id, created_at, status,
      receiver:profiles!connections_receiver_id_fkey (
        id, first_name, last_name, role, degree, year_of_study, avatar_initials,
        profile_modules(modules(code))
      )
    `)
    .eq('sender_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    connectionId: row.id,
    createdAt: row.created_at,
    status: row.status,
    ...flattenProfile(row.receiver)
  }));
}

async function getConnectedProfiles() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb().rpc('get_connected_profiles', { my_id: user.id });
  if (error) throw error;
  return data;
}

// ── REALTIME ─────────────────────────────────────────────────

function subscribeToConnections(userId, callback) {
  return sb()
    .channel('connections_realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'connections',
      filter: `receiver_id=eq.${userId}`
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'connections',
      filter: `sender_id=eq.${userId}`
    }, callback)
    .subscribe();
}

// ── HELPERS ──────────────────────────────────────────────────

function flattenProfile(p) {
  if (!p) return {};
  return {
    ...p,
    modules: (p.profile_modules || []).map(pm => pm.modules?.code).filter(Boolean),
    profile_modules: undefined
  };
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m || 1} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}