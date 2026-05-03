# 🎓 PeerBridge

> A peer-to-peer academic matching platform that connects university students with tutors and study partners based on shared modules.

![PeerBridge Dashboard](https://img.shields.io/badge/status-active-brightgreen) ![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E?logo=supabase) ![HTML](https://img.shields.io/badge/frontend-HTML%2FCSS%2FJS-orange)

---

## 📖 Overview

PeerBridge helps university students find the right academic support by matching them with peers who share the same modules. Students can connect as either a **student** looking for help or a **tutor** offering support. Contact details remain private until both parties accept a connection — keeping interactions safe and intentional.

---

## ✨ Features

- 🔍 **Smart Matching** — Matches users based on shared module codes
- 🔒 **Privacy-first** — Contact details only revealed after mutual connection acceptance
- 📬 **Connection Requests** — Send, accept, decline, or withdraw requests
- 🤝 **Connected Profiles** — Full contact details visible only to confirmed connections
- 👤 **Profile Management** — Edit name, university, degree, year, bio, availability, contact preference, and phone number
- 📚 **Module Tagging** — Add and remove module codes to improve match accuracy
- 🔔 **Realtime Updates** — Live connection request notifications via Supabase Realtime
- 📱 **Responsive Design** — Works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | [Supabase](https://supabase.com) (PostgreSQL + Auth + Realtime) |
| Auth | Supabase Auth (email/password) |
| Fonts | Google Fonts — Playfair Display, Outfit |

---

## 🗄️ Database Schema

### Tables

**`profiles`**
| Column | Type | Description |
|---|---|---|
| `id` | uuid | References `auth.users.id` |
| `first_name` | text | |
| `last_name` | text | |
| `role` | text | `'student'` or `'tutor'` |
| `university` | text | |
| `degree` | text | |
| `year_of_study` | text | |
| `bio` | text | |
| `availability` | text | |
| `contact_pref` | text | e.g. WhatsApp, Email |
| `phone` | text | |
| `avatar_initials` | text | Auto-generated from name |

**`modules`**
| Column | Type | Description |
|---|---|---|
| `id` | uuid | |
| `code` | text | e.g. `MATH101` |

**`profile_modules`**
| Column | Type | Description |
|---|---|---|
| `profile_id` | uuid | References `profiles.id` |
| `module_id` | uuid | References `modules.id` |

**`connections`**
| Column | Type | Description |
|---|---|---|
| `id` | uuid | |
| `sender_id` | uuid | References `profiles.id` |
| `receiver_id` | uuid | References `profiles.id` |
| `status` | text | `'pending'`, `'accepted'`, `'declined'` |
| `created_at` | timestamp | |

### RPC Functions

| Function | Description |
|---|---|
| `get_matches(my_id)` | Returns ranked matches based on shared modules |
| `get_connected_profiles(my_id)` | Returns full profiles of accepted connections |
| `upsert_module(p_code)` | Inserts or returns a module by code |

---

## 🚀 Getting Started

### Prerequisites

- A [Supabase](https://supabase.com) account and project
- A web server or static host (e.g. VS Code Live Server, Netlify, Vercel)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/peerbridge.git
cd peerbridge
```

### 2. Set up Supabase

1. Create a new Supabase project
2. Run the SQL schema (tables, RPC functions, RLS policies) in the **SQL Editor**
3. Enable **Email Auth** under Authentication → Providers

### 3. Configure your credentials

Open `supabase.js` and replace the placeholders with your project values:

```javascript
const SUPABASE_URL  = 'https://your-project.supabase.co';
const SUPABASE_ANON = 'your-anon-public-key';
```

Both values are found in your Supabase project under **Settings → API**.

### 4. Run the app

Open `signin.html` in your browser or serve the folder with Live Server.

---

## 📁 File Structure

```
peerbridge/
├── index.html          # Redirects to signin
├── signin.html         # Login page
├── signup.html         # Registration page
├── dashboard.html      # Main app (matches, requests, connections, profile)
└── supabase.js         # Supabase client + all API helper functions
```

---

## 🔐 Security Notes

- **Row Level Security (RLS)** should be enabled on all tables in Supabase
- Phone numbers and emails are never exposed to unconnected users — enforced at the RPC/query level
- The `get_connected_profiles` function uses `SECURITY DEFINER` to safely join `auth.users` for email retrieval

---

## 🙋 Usage Flow

1. **Sign up** with your name, email, password, role (student/tutor), and phone number
2. **Add your modules** on the profile page (e.g. `MATH101`, `CS201`)
3. **Browse matches** — users who share your modules appear ranked by overlap
4. **Send a connection request** to a match
5. **Both parties accept** → full contact details are revealed
6. **Connect outside the app** via WhatsApp, email, or your preferred method

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">Built with ❤️ for students, by students.</p>
