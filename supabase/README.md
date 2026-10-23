# Connecting Supabase (admin sign-in, products and photos)

Until these steps are done the website shows the built-in sample products and
the admin area can't sign in. Supabase's free plan is enough.

## 1. Create the project

1. Sign up at <https://supabase.com> and click **New project**.
2. Choose a name (e.g. `farop-clothing`), a strong database password, and the
   region closest to Zimbabwe (e.g. *South Africa* / *Europe West*).

## 2. Create the tables, security rules and photo storage

1. In the project, open **SQL Editor → New query**.
2. Paste the whole of [`schema.sql`](./schema.sql) and click **Run**.
   It is safe to run again later.

## 3. Create the first (developer) admin

1. Open **Authentication → Users → Add user → Create new user**.
   Enter your email and a strong password, and tick **Auto confirm user**.
2. Back in **SQL Editor**, run (with that email and your name):

   ```sql
   insert into public.admin_users (user_id, email, name, role)
   select id, email, 'Your name', 'developer' from auth.users where email = 'you@example.com'
   on conflict (user_id) do update set role = excluded.role;
   ```

3. Recommended: **Authentication → Providers → Email** → turn off
   **Allow new users to sign up**, so nobody can create their own account.
4. For "Forgot password?" emails: **Authentication → URL Configuration** →
   set **Site URL** to the live address (e.g. `https://faropclothing.com`) and
   add these **Redirect URLs**:
   - `https://faropclothing.com/admin/auth/callback`
   - `http://localhost:3000/admin/auth/callback` (for local development)

   The free plan sends only a few auth emails per hour; for real use, set up
   your own email sender under **Authentication → Emails → SMTP Settings**.

Everyone else is added from the admin area's **Team** page:

| Role | Can do |
|---|---|
| Regular admin | Add and edit products, prices and photos; hide or show them |
| Supreme admin | Everything above, plus delete products, edit business settings, add / change / remove regular admins |
| Developer admin | Everything, including supreme admins, technical settings and resetting any admin's forgotten password. There is only one, added with the SQL above; it can't be changed or removed from the admin area and is hidden from all other admins |

Nobody can change or remove their own account.

## 4. Connect the website

1. Open **Project Settings → API** (or **Data API / API Keys**) and copy:
   - the **Project URL**
   - the **anon / publishable** key
   - the **service_role / secret** key — needed only so the Team page can
     create and remove admin sign-in accounts. Keep it secret.
2. Add them as environment variables — in a `.env.local` file for local
   development, and in the hosting provider's settings (e.g. Vercel →
   Project → Settings → Environment Variables) for the live site:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   # Server-only. Never prefix with NEXT_PUBLIC_.
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

3. Restart the dev server / redeploy the site.

## 5. First sign-in

1. Go to `/admin/login` and sign in.
2. The product list starts empty. Either click **New product**, or
   **Add the 14 sample products** and edit them into your own (replace the
   photos, prices and descriptions, or delete them).

## How it works

- **Shop:** reads products from the `products` table. Only products marked
  *Visible* are shown; Row Level Security enforces this in the database.
- **Admin:** only users listed in `admin_users` can sign in. Their role
  (regular / supreme / developer) decides what they can do; every action is
  checked on the server and again by the database's security rules.
- **Business settings:** stored in `site_settings` and shown across the
  website (contact page, footer, checkout, FAQs). Until something is saved,
  the defaults in `src/config/site.ts` are used.
- **Finances:** sales (`sales`, `sale_items`), expenses (`expenses`) and
  product cost prices (`product_costs`, kept out of the public `products`
  table) are readable only by supreme and developer admins and by regular
  admins granted "View finances"; only those granted "Record sales &
  expenses" (or supreme/developer) can change them.
- **Sold products leave the shop:** recording a sale as paid or awaiting
  payment deletes its catalogue products (and their photos) in the same step;
  the sale keeps each item's name, price, cost, category and condition.
- **Photos:** stored in the public `product-images` bucket (5 MB max, JPG / PNG
  / WebP / AVIF). Replacing or deleting a product's photo removes the old file.
- **Changes appear on the website immediately** after saving.
