# Lok Transfer × GSix account library

## Product decision

Give signed-in GSix members a private **Transfer History** on `/profile` and on the transfer site. The free history records playlist/track names, original source links, order, requested format, timestamps, and honest outcomes. It does not imply that the cloud holds a file merely because a person downloaded one locally.

Offer a later **Lok Passport Library** for originals and other files the member is permitted to upload and retain. A paid plan changes quota and convenience; it does not confer rights to copy or store third-party media. Keep the free local conversion and export flow.

| Surface | Free account | Future Passport |
| --- | --- | --- |
| Transfer History | Private searchable names, links, order, status, and manifest export | Same history, perhaps larger limits and filters |
| Local export | Browser or desktop output stays on device | Same |
| Cloud Library | Optional small trial for authorized uploads, or none at launch | Private authorized media, cross-device download, quota and retention shown clearly |
| YouTube page/playlist | Link and metadata history; open at source | Same; no cloud copy or re-download entitlement |

This follows [YouTube API Services developer policies](https://developers.google.com/youtube/terms/developer-policies), which prohibit downloading, importing, backing up, caching, or storing copies of YouTube audiovisual content without YouTube's prior written approval. For a creator's own uploads, direct them to [YouTube Studio's download flow](https://support.google.com/youtube/answer/56100), then let them upload an authorized file themselves. A study use case or subscription does not itself grant permission.

## User journey

1. A visitor pastes a playlist or file link. The page displays the correct action: prepare a local playlist job, import a direct authorized file, or upload an original.
2. If signed in, **Save to history** records the normalized source URL, playlist/track metadata and positions. Signed-out visitors can continue locally; do not silently collect their links.
3. A local runner or browser converter may report `prepared`, `downloaded_to_device`, `failed`, or `unavailable`. These are distinct from `stored_in_library`. For local jobs, offer an explicit **Sync result to GSix** action using the manifest; don't assume a command ran just because it was copied.
4. In private GSix `/profile`, a **Transfers** tab lists recent playlists, track rows, source links, and status. A user can search, delete entries, export CSV/JSON, and reopen a source. Public `/profile/[handle]` never reveals history by default.
5. A member with a permitted original file chooses **Keep in my Library**. The page explains storage, quota, retention and deletion; only after upload completes does the item gain a cross-device **Download file** action.

Suggested copy: **Saved to history** means names and links are synced. **Saved to this device** means the browser or runner created local files. **Saved in your Library** means an authorized upload is available across devices.

## Existing ecosystem fit

The `Gsixhub` repository already has a Supabase Auth client, `LokSessionAdapter` shared-cookie session on `.gsix.online`, a private `/profile`, a public `/profile/[handle]`, and existing `lok_profiles` rows. Reuse the Supabase user ID and profile; do not create a second account. Put transfer on `transfer.gsix.online` once DNS, Supabase redirect allow-list, and the app's auth callback are configured. The current `lok-playlist-dowloader.vercel.app` domain cannot read the `.gsix.online` cookie, so it needs a normal redirect sign-in flow until the custom domain is active. Verify the production GSix deployment uses this repository/branch before changing it.

### Data contract

- `transfer_batches`: `id`, `user_id`, `source_type`, `source_url`, `title`, `created_at`, `updated_at`.
- `transfer_items`: `id`, `batch_id`, `user_id`, `position`, `title`, `source_url`, `requested_format`, `status`, `local_filename`, `asset_id` nullable, `created_at`. Index `(user_id, created_at desc)` and `(batch_id, position)`. Use an event/job ID to make repeat sync idempotent.
- `library_assets`: `id`, `user_id`, private object key, original filename, MIME type, byte count, checksum, declared rights/source, state, created/expiry/deleted timestamps. Store no permanent public URL in history.
- `account_entitlements`: `user_id`, plan, byte quota, status, billing customer reference; server writes only. The client never chooses its own quota or paid status.

Enable Row Level Security on every exposed table. Policies require `user_id = auth.uid()` for reads and writes, with batch ownership checked for item inserts; keep `asset_id` attachment server-controlled so a user cannot claim someone else's object. Private storage downloads require a short-lived signed URL issued after authentication, ownership and entitlement checks. Follow [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Vercel Blob private storage](https://vercel.com/docs/vercel-blob/private-storage) if Blob is selected. Direct browser uploads avoid forwarding large media through a Vercel function; validate content type, size, rights attestation and quota before granting a narrowly scoped upload token, then verify the completed upload server-side.

### Lightweight launch and cost controls

- Start with metadata only. Cursor-page 25–50 records, index user/date, cap title and URL lengths, and put a per-account limit on history records (proposed pilot: 1,000 items), with clear delete/export controls. No background media caching.
- Keep private assets out of the first launch. Pilot Passport with a small quota (e.g. 1 GB) and measure stored GB, outbound GB, requests and failed uploads per active member before setting prices. File size and transfer, not a row of metadata, will dominate costs. Show quota and storage used in the profile.
- For a scale illustration, 1,000 members storing 1 GB each is about 1 TB before copies or overhead. Price storage **and** downloads using the current provider price sheet, set spend alerts and abuse limits, and budget support/refunds. Do not publish a price until pilot usage and product rights are reviewed.
- No automatic upload of locally downloaded files. No public sharing in the first version. Define downgrade grace period and deletion/export policy before charging for storage.

## Phases and acceptance gates

1. **History MVP:** migration and RLS tests; authenticated save/list/delete/export APIs; transfer page sign-in; private GSix profile tab. Verify one user cannot read another user's rows, unauthenticated visits remain usable, and playlist positions/source links survive sync.
2. **Cross-domain handoff:** map `transfer.gsix.online`; test cookie/PKCE redirects and logout across desktop and phone. A local runner may explicitly sync a manifest with a user-scoped token or import the JSON from the profile; copying the command alone must never create a false success row.
3. **Authorized Library pilot:** private bucket, scoped upload/download, quota, validation, delete and lifecycle jobs; test multi-device retrieval and quota enforcement. Give Survivor 616/DAW a separate **Import from Library** consent flow using a short-lived file URL, or import a local ZIP.
4. **Passport billing:** Stripe Checkout/portal and verified webhooks update server-side entitlements, with idempotent events and a grace period. See [Stripe Entitlements](https://docs.stripe.com/billing/entitlements). Charge for genuinely useful storage/workflow features rather than promising third-party YouTube copies.

No database migration, GSix profile tab, cloud storage, or billing is deployed by this plan. Branding on Lok Transfer: **Powered by Lock Services · Designed by G6 Designs**.
