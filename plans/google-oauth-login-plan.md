# Planning: Implementasi Google OAuth Login dengan Whitelist untuk Mermaid Live Editor

## 1. Overview Project

### Kebutuhan Utama
- **Login**: Google OAuth
- **Access Control**: Whitelist berbasis email
- **Authorized Email**: donyahmd24@gmail.com

### Current State
- **Framework**: SvelteKit dengan static adapter (`adapter-static`)
- **Deployment**: Netlify
- **UI Components**: bits-ui, TailwindCSS
- **Routing**: Client-side rendering (CSR) only

### Kebutuhan
Menambahkan fitur login dengan Google OAuth dengan sistem whitelist email sebelum user dapat menggunakan aplikasi canvas Mermaid.

---

## 2. Arsitektur Solution

```mermaid
flowchart TD
    A[User visits app] --> B{Check auth status}
    B -->|Not logged in| C[Show Login Page]
    B -->|Logged in| D{Check Whitelist}
    D -->|Not in whitelist| E[Show Access Denied]
    D -->|In whitelist| F[Allow access to Editor]
    C --> G[Click "Login with Google"]
    G --> H[Redirect to Google OAuth]
    H --> I[Google OAuth Callback]
    I --> J[Validate email]
    J --> K{Email in whitelist?}
    K -->|No| E
    K -->|Yes| L[Create session]
    L --> F
    
    subgraph "Auth Flow"
    M[Google Cloud Console] --> H
    end
```

---

## 3. Step-by-Step Implementation Plan

### Step 1: Setup Google Cloud Console
- [ ] Buat project di Google Cloud Console
- [ ] Enable Google Identity Services API
- [ ] Buat OAuth 2.0 credentials (Client ID & Client Secret)
- [ ] Configure authorized redirect URIs
- [ ] Configure authorized JavaScript origins

### Step 2: Environment Configuration
- [ ] Tambah environment variables di `.env`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `ALLOWED_EMAILS=donyahmd24@gmail.com` (comma-separated untuk multiple emails)
- [ ] Update `src/lib/util/env.ts` untuk expose config
- [ ] Update `.env` example / documentation

### Step 3: Install Auth Dependencies
- [ ] Install auth library (sesuai pilihan):
  - Option A: `@auth/sveltekit` (Auth.js) - lebih lengkap
  - Option B: Custom implementation dengan `googleapis`
- [ ] Install necessary peer dependencies

### Step 4: Create Auth Store / State Management
- [ ] Create `src/lib/stores/auth.ts`:
  - `user` store (current user data)
  - `isAuthenticated` derived store
  - `isLoading` store
- [ ] Create authentication helper functions

### Step 5: Create Login Page Component
- [ ] Create `src/routes/login/+page.svelte`
- [ ] Create `src/routes/login/+page.ts` (load function)
- [ ] Design login UI dengan Google button
- [ ] Add loading states

### Step 6: Configure Whitelist
- [ ] Define whitelist di environment variables atau config file
- [ ] Add `ALLOWED_EMAILS` di `.env`
- [ ] Update `src/lib/util/env.ts` untuk expose whitelist
- [ ] Create whitelist validation function

### Step 7: Implement Google OAuth Flow
- [ ] Create OAuth authorization URL
- [ ] Handle redirect ke Google
- [ ] Handle callback dari Google
- [ ] Validate dan exchange authorization code
- [ ] Get user email dari Google OAuth response
- [ ] Validate email against whitelist
- [ ] Create session / store user data hanya jika email di-whitelist

### Step 8: Protect Routes
- [ ] Modify `src/routes/+layout.svelte` - check auth before rendering
- [ ] Create auth guard / redirect logic
- [ ] Handle protected routes: `/edit/`, `/view/`
- [ ] Add access denied page untuk email yang tidak di-whitelist

### Step 9: Update Navigation
- [ ] Update Navbar untuk show Login/Logout buttons
- [ ] Show user avatar/name setelah login
- [ ] Add logout functionality

### Step 10: Persist Session
- [ ] Store session di localStorage atau cookies
- [ ] Handle session expiry
- [ ] Auto-refresh token jika perlu

### Step 11: Testing
- [ ] Test login flow dengan email yang di-whitelist
- [ ] Test login flow dengan email yang TIDAK di-whitelist (harus ditolak)
- [ ] Test logout flow
- [ ] Test session persistence
- [ ] Test protected routes
- [ ] Test error handling

---

## 4. Technical Decisions

### Auth Library Selection
| Option | Pros | Cons |
|--------|------|------|
| Auth.js (`@auth/sveltekit`) | Complete solution, well maintained | More setup, mungkin overkill |
| Custom + `googleapis` | Lightweight, full control | More code to maintain |

### Session Storage
- **localStorage**: Simple, client-side only
- **Cookies**: Better security, can be httpOnly

### Protected Routes Strategy
- Check auth di `+layout.svelte` level
- Redirect ke `/login` jika not authenticated
- Return URL parameter untuk redirect back after login

### Whitelist Implementation
- **Storage**: Environment variable (`.env`) untuk production safety
- **Format**: Array of email addresses
- **Validation**: Check email after Google OAuth callback
- **Default whitelist**: `donyahmd24@gmail.com` (dapat ditambahkan lebih banyak)

---

## 5. File Structure Changes

```
src/
├── lib/
│   ├── stores/
│   │   └── auth.ts          # NEW - Auth stores
│   ├── services/
│   │   └── auth.ts          # NEW - Auth service functions
│   └── util/
│       └── env.ts           # MODIFY - Add Google OAuth + whitelist env vars
├── routes/
│   ├── login/
│   │   ├── +page.svelte    # NEW - Login page
│   │   └── +page.ts        # NEW - Login page load function
│   ├── access-denied/
│   │   └── +page.svelte    # NEW - Access denied page
│   ├── logout/
│   │   └── +server.ts      # NEW - Logout handler
│   └── api/
│       └── auth/
│           └── [...auth]/
│               └── +server.ts  # NEW - Auth.js API routes (if using)
├── components/
│   └── Navbar.svelte       # MODIFY - Add login/logout UI
└── routes/
    └── +layout.svelte      # MODIFY - Add auth check
```

---

## 6. Alternative Approaches

### Option A: Client-side Only OAuth (Implicit Flow)
- Simpler, no server needed
- Less secure, token visible in URL
- **Not recommended untuk production**

### Option B: Backend API (Recommended)
- Use external auth service or Netlify Functions
- More secure, proper token handling
- Requires additional infrastructure

### Option C: Third-party Auth Service
- Use services like: Clerk, Auth0, Firebase Auth
- Quickest setup, monthly cost
- More dependencies

---

## 7. Next Steps

1. **Pilih auth library** yang akan digunakan
2. **Setup Google Cloud Console** dan получить credentials
3. **Mulai implementasi** dengan step-by-step plan di atas

---

## 8. Questions untuk Clarification

- [ ] Apakah ada preferensi auth library tertentu?
- [ ] Apakah sudah punya Google Cloud Console credentials?
- [ ] Bagaimana dengan user data storage? (database atau hanya session)
- [ ] Apakah perlu fitur user profile / dashboard?
