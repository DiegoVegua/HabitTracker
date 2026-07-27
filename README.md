# 🌱 Habitudes — Habit Tracker

Suivi d'habitudes rapide, épuré et bienveillant. Pensé pour un usage quotidien
sur le long terme (esprit _Streaks_ / _Things 3_), pas un prototype jetable.

- **Next.js 14 (App Router) + TypeScript**
- **Tailwind CSS + shadcn/ui** (composants inclus dans `src/components/ui`)
- **Supabase** — Auth (Google + email/mot de passe) + Postgres + Realtime
- **React Query** — cache, optimistic UI, invalidation
- **Déploiement : Vercel**
- Mobile-first, responsive complet, **dark mode**

---

## 1. Prérequis

- **Node.js 18.17+** (Next 14). Vérifiez : `node --version`.
- Un compte **Supabase** (gratuit) : https://supabase.com
- (Optionnel pour le déploiement) un compte **Vercel**.

> ⚠️ Cette machine n'avait pas Node installé au moment du scaffold : le projet
> n'a donc pas été compilé ici. Installez Node puis lancez `npm install` +
> `npm run typecheck` pour valider en local.

---

## 2. Configuration Supabase

### 2.1 Créer le projet et le schéma

1. Créez un projet sur https://supabase.com.
2. Ouvrez **SQL Editor** et exécutez le contenu de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Cela crée les tables `habits` et `habit_logs`, les **RLS** (chaque
   utilisateur ne voit que ses données) et active le **Realtime**.

### 2.2 Récupérer les clés

**Project Settings → API** :

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> La clé `anon` est publique et sûre côté client : la sécurité repose sur les
> RLS Postgres. Ne mettez **jamais** la clé `service_role` dans le front.

### 2.3 Auth email

**Authentication → Providers → Email** : activé par défaut. Pour tester vite,
vous pouvez désactiver « Confirm email » (Authentication → Providers → Email →
_Confirm email_) pendant le développement.

### 2.4 Auth Google (OAuth)

1. Dans **Google Cloud Console**, créez un _OAuth 2.0 Client ID_ (type
   « Application Web »).
2. **Authorized redirect URI** :
   `https://<votre-ref>.supabase.co/auth/v1/callback`
3. Copiez _Client ID_ et _Client secret_ dans **Supabase → Authentication →
   Providers → Google**.
4. Dans **Authentication → URL Configuration** :
   - _Site URL_ : `http://localhost:3000` (dev) puis votre URL Vercel (prod).
   - _Redirect URLs_ : ajoutez `http://localhost:3000/auth/callback` et
     `https://votre-app.vercel.app/auth/callback`.

---

## 3. Variables d'environnement

Copiez `.env.example` → `.env.local` et remplissez :

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` sert à construire l'URL de redirection OAuth.

---

## 4. Lancer en local

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Autres scripts :

```bash
npm run typecheck   # vérifie les types (tsc --noEmit)
npm run build       # build de production
npm run lint        # ESLint
```

---

## 5. Déploiement Vercel

1. Poussez le repo sur GitHub, importez-le dans Vercel.
2. Ajoutez les 3 variables d'environnement (Settings → Environment Variables).
   Mettez `NEXT_PUBLIC_SITE_URL` = votre URL de production.
3. Mettez à jour dans Supabase les _Redirect URLs_ et la _Site URL_ avec le
   domaine Vercel.
4. Déployez.

---

## 6. Structure du projet

```
habit-tracker/
├─ supabase/migrations/0001_init.sql   # schéma + RLS + realtime
├─ middleware.ts                        # rafraîchit la session + garde les routes
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                     # providers (thème, React Query, toasts)
│  │  ├─ page.tsx                       # redirection selon l'auth
│  │  ├─ login/page.tsx                 # connexion (Google + email)
│  │  ├─ auth/callback/route.ts         # échange du code OAuth
│  │  ├─ auth/signout/route.ts          # déconnexion
│  │  └─ (app)/                         # routes protégées
│  │     ├─ layout.tsx                  # garde d'auth + AppShell
│  │     ├─ today/page.tsx              # vue « Aujourd'hui »
│  │     ├─ habits/page.tsx             # gestion des habitudes
│  │     └─ stats/page.tsx              # statistiques
│  ├─ components/
│  │  ├─ ui/                            # shadcn/ui (button, card, dialog, …)
│  │  ├─ layout/                        # AppShell, ThemeToggle
│  │  ├─ habits/                        # today-view, form, check-button, …
│  │  └─ stats/                         # heatmap, stats-view
│  ├─ hooks/
│  │  ├─ use-habits.ts                  # ★ données + realtime + optimistic UI
│  │  └─ use-toast.ts
│  ├─ lib/
│  │  ├─ supabase/                      # clients browser / server / middleware
│  │  ├─ dates.ts                       # ★ frontière de journée (fuseau local)
│  │  ├─ frequency.ts                   # « habitude prévue ce jour ? »
│  │  ├─ streaks.ts                     # ★ streaks + taux (calcul à la volée)
│  │  └─ colors.ts                      # palette d'habitudes
│  ├─ providers/                        # theme + react-query
│  └─ types/db.ts                       # types alignés sur le schéma
```

Les fichiers ★ concentrent la logique non triviale — commencez par là.

---

## 7. Choix techniques (à lire avant de modifier)

### Source de vérité unique : `habit_logs`
Les streaks et statistiques ne sont **jamais stockés**. On charge les logs et on
dérive tout à la volée (`src/lib/streaks.ts`). Moins de bugs de synchro, pas de
compteurs à maintenir. Une ligne dans `habit_logs` = « fait ce jour-là »
(décocher supprime la ligne → heatmap propre).

### Frontière de journée = fuseau **local** du navigateur
Voir l'en-tête de `src/lib/dates.ts`. On stocke une **date nue** (`YYYY-MM-DD`),
pas un timestamp : « fait aujourd'hui » = un log à la date civile locale du jour.
Simple et conforme à l'usage (« l'ai-je fait aujourd'hui, là où je suis ? »).

### Calcul des streaks (`src/lib/streaks.ts`)
Trois régimes selon la fréquence :
- **daily** : jours civils consécutifs complétés.
- **specific_days** : seules les occurrences planifiées comptent.
- **weekly_count** : on raisonne en **semaines** ; une semaine « réussie »
  atteint `weekly_target` complétions ; la série compte les semaines réussies
  consécutives.

**Règle de grâce (anti-culpabilisation)** : le jour / la semaine **en cours**,
s'il n'est pas encore complété, ne **casse pas** la série (il est simplement
ignoré). La série ne se rompt que sur un jour/semaine **passé** raté. Ouvrir
l'app le matin ne montre donc jamais « série perdue ».

### Optimistic UI (`useToggleLog` dans `src/hooks/use-habits.ts`)
Cocher met à jour le cache React Query **immédiatement** ; la requête Supabase
part en arrière-plan ; rollback automatique en cas d'erreur. Le tap est instantané.

### Synchro temps réel (`useRealtimeSync`)
Abonnement Supabase Realtime aux tables `habits` / `habit_logs` monté une fois
dans `AppShell`. Toute modification invalide le cache → les appareils restent
synchronisés. Les RLS étant actives, chaque client ne reçoit que ses propres
lignes.

### Design anti-culpabilisation
- Un jour manqué est une simple case vide, jamais un signal rouge.
- Les paliers de streak (7 / 30 / 100 / 365) donnent un toast discret, sans pop-up
  bloquant (`STREAK_MILESTONES` dans `streaks.ts`).
- Pas de système de niveau / gamification lourde (choix assumé, cf. cahier des
  charges). Les paliers restent le seul élément « ludique ».

---

## 8. Idées d'évolution

- Réordonnancement des habitudes par glisser-déposer (`sort_order` existe déjà).
- Rappels / notifications (PWA + web push).
- Export CSV des logs.
- Regrouper les habitudes par moment de la journée (matin / soir).
- Le champ `completed` de `habit_logs` permettrait de distinguer « raté
  explicitement » de « non renseigné » si besoin plus tard.
```
