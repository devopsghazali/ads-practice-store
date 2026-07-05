# NovaGear — Ads Practice Store

A dummy e-commerce website built for one purpose: **practicing Google Tag Manager, Facebook Pixel, and Google Ads.** It's a static site (plain HTML/CSS/JS) with a working cart, checkout, thank-you and lead-form page — each one fires the right `dataLayer` events so you have real triggers to build GTM tags against.

No real payments, no backend, no database. Everything (cart) is stored in the browser's `localStorage`.

## 1. Add your GTM container ID

Every HTML file has a GTM snippet with a placeholder ID `GTM-XXXXXXX` (once in `<head>`, once in `<body>`). Replace it everywhere:

```bash
# from inside the ads-practice-store folder
grep -rl "GTM-XXXXXXX" *.html
# then find-and-replace GTM-XXXXXXX -> your real container ID (e.g. GTM-ABC1234) in each file
```

Or just open each `.html` file and replace the two occurrences manually.

## 2. Pages & the events they fire

| Page | URL | `dataLayer` event | Use it for |
|---|---|---|---|
| Home | `index.html` | — | Landing page traffic, base pixel |
| Shop | `shop.html` | `view_item_list` | Product catalog / dynamic remarketing |
| Product detail | `product.html?id=1` | `view_item` | Facebook `ViewContent`, Google Ads dynamic remarketing |
| Add to Cart button | any product card | `add_to_cart` | Facebook `AddToCart` |
| Cart | `cart.html` | `view_cart` | — |
| Checkout | `checkout.html` | `begin_checkout` | Facebook `InitiateCheckout` |
| Thank you (after placing order) | `thank-you.html` | `purchase` (with `transaction_id`, `value`, `items`) | **Conversion tracking** — Google Ads "Purchase" conversion, Facebook `Purchase` |
| Contact / lead form | `contact.html` | `generate_lead` | **Lead gen** — Google Ads "Lead" conversion, Facebook `Lead` |

Open your browser console — every push is also logged there (`[dataLayer push] ...`) so you can see exactly what data is available when building GTM variables.

## 3. Suggested GTM setup to practice

**Variables** (Variables → New → Data Layer Variable):
- `DLV - ecommerce.value`
- `DLV - ecommerce.transaction_id`
- `DLV - ecommerce.currency`
- `DLV - ecommerce.items`

**Triggers** (Custom Event, matching the table above):
- `add_to_cart`, `view_item`, `begin_checkout`, `purchase`, `generate_lead`

**Tags to build:**
1. **GA4 Configuration tag** — fires on All Pages.
2. **Facebook Pixel base code** (Custom HTML tag) — fires on All Pages. Then add Custom HTML tags for `AddToCart`, `ViewContent`, `InitiateCheckout`, `Purchase`, `Lead`, each firing on its matching custom event trigger, passing `value`/`currency` from the variables above.
3. **Google Ads remarketing tag** — fires on All Pages, so anyone who visits can be retargeted later.
4. **Google Ads conversion tracking tag** — fires only on the `purchase` event (checkout conversion) and the `generate_lead` event (lead conversion), using the `value`/`transaction_id` variables.

This gives you the full loop: **page view → remarketing tag → retarget with Facebook/Google Ads → conversion tracked on thank-you/contact page.**

## 4. Testing locally

Because this uses `localStorage`/`sessionStorage` and `fetch`-free JS, you can just double-click `index.html` — but GTM's own preview mode and some browsers behave better over `http://` than `file://`. Easiest options:
- Deploy to Vercel (see below) and test on the live URL, or
- Run a quick local server: `npx serve .` (from inside `ads-practice-store/`) then open the printed `http://localhost` URL.

Use **GTM Preview mode** (Tags → Preview) to confirm each event fires and each tag triggers correctly before publishing the container.

## 5. Deploy to Vercel

1. Push this folder to GitHub (already done if you're reading this from the repo).
2. On [vercel.com](https://vercel.com), "Add New Project" → import this GitHub repo.
3. Framework preset: **Other** (it's static HTML — no build command needed, no output directory override needed).
4. Deploy. You'll get a live `*.vercel.app` URL to run real Facebook/Google ad campaigns against.

## 6. Extra practice features (v2)

| Feature | Page | Event / Trigger to practice |
|---|---|---|
| UTM/gclid/fbclid capture | all pages (`js/script.js`) | attached to `purchase` & `generate_lead`; see Thank You page "Attributed to" box |
| Consent banner (Accept/Reject) | all pages | `consent_update` — Google Consent Mode v2 |
| WhatsApp / Call floating buttons | all pages | `contact_click` |
| Newsletter signup (footer) | all pages | `sign_up` |
| Search + category filters | `shop.html` | `search`, `view_item_list` |
| Wishlist | `shop.html` → `wishlist.html` | `add_to_wishlist` |
| 3-step lead form | `contact.html` | `funnel_step` (x2) then `generate_lead` — practice drop-off retargeting |
| YouTube video | `video.html` | GTM's **built-in YouTube Video trigger** (no code needed — enable it in GTM) |
| Long article | `blog.html` | GTM's **built-in Scroll Depth trigger** + outbound link clicks |
| Live events viewer | `events-log.html` | see every `dataLayer.push()` without opening DevTools |

Try: open the site with `?utm_source=facebook&utm_medium=paid&utm_campaign=test1` appended to the URL, browse, place a test order, then check `events-log.html` and the Thank You page.

## 7. Mailchimp (newsletter + lead form)

Newsletter (footer) and the 3-step Contact form both submit to `/api/subscribe.js`, a Vercel serverless function that calls Mailchimp **server-side** — the API key is never exposed to the browser.

On Vercel: Project → Settings → Environment Variables, add:
- `MAILCHIMP_API_KEY`
- `MAILCHIMP_LIST_ID` (your Audience ID)

Then redeploy. Locally (no backend), these forms will just show an error — that's expected, since `/api` functions only run on Vercel (or via `vercel dev`).

## Notes

- Product data, prices, and images (emoji placeholders) are all fake — feel free to edit `js/script.js` (`PRODUCTS` array) to change them.
- This is for **ad-platform learning purposes only**. Don't use it to actually collect real payments or real customer data.
