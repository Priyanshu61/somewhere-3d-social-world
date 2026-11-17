# Somewhere — a shared 3D world for friends

[![Live app](https://img.shields.io/badge/Open_live_app-2f6f59?style=for-the-badge)](https://somewhere-guest-world.somewhere-free.workers.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License](https://img.shields.io/badge/license-source_available-blue?style=flat-square)](#license-and-assets)

**Meet friends inside a colorful 3D village.** Walk with WASD, visit cafés and parks, ride a taxi, chat in private rooms, talk over live voice, listen to shared music, or watch permitted videos together in the cinema.

### [Launch Somewhere →](https://somewhere-guest-world.somewhere-free.workers.dev/)

No ChatGPT account or installation is required. Choose a nickname, create a room, send its private invitation to friends, approve them, and lock the room when everyone arrives.

## What you can do

- Explore a browser-based 3D village with keyboard and touch controls.
- Create private rooms for up to ten people with expiring invitations and host approval.
- Use encrypted room chat, animated avatars, live voice chat, shared seating, and taxi rides.
- Share supported audio or video files up to 50 MB temporarily between room members.
- Watch permitted videos on the in-world cinema screen with synchronized host controls.
- Run the complete project on Cloudflare's free tier without keeping a personal computer online.

If you enjoy the project, star the repository and share the [live app](https://somewhere-guest-world.somewhere-free.workers.dev/) with someone you want to meet there.

## Media sharing

In Activities, the host can choose an audio/video file up to 50 MB. Guests click **Receive shared file** to receive encrypted chunks, verify the file hash, and join playback. Transfers require the host to remain connected; files are held temporarily in browser memory and are not saved on the server. For larger files, use the existing direct HTTPS link option. Personal audio mute stays independent of host play/pause, and playback speed is fixed at 1×.

This edition replaces the Railway account-server setup. Guests choose a nickname and enter: no password, email, Google, Facebook, or ChatGPT account. Social sign-in is deferred.

The 3D world, animation, camera, media decoding, and encryption run in each person's browser. A small **Cloudflare Worker + SQLite Durable Object** handles invitations, guest sessions, host approval, and encrypted message delivery. Your laptop does not need to stay on after deployment. This is not a fully serverless peer-to-peer messenger: internet rooms still need shared infrastructure.

## Cost

Use **Workers Free**, the included `workers.dev` address, and the included SQLite-backed Durable Object. No paid plan, paid domain, Railway server, R2 bucket, or database subscription is required by this configuration. Free hosting has usage limits. If limits are exhausted, requests can fail; it is not a promise of unlimited free operation or uninterrupted availability. Keep the account on Free and check the dashboard before upgrading anything.

Cloudflare currently includes 100,000 Durable Object requests/day (incoming WebSocket messages are counted at a discount) and 13,000 GB-seconds/day. Static-asset requests are free. These quotas are shared across your account. Movement is capped at five network updates/second and unchanged states are suppressed to reduce usage. A busy public app can exceed the allowances.

Sources checked 17 November 2026: [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

## Publish once — then turn your computer off

Only the owner needs a Cloudflare account. Visitors do not.

1. Create a Cloudflare account and keep Workers on the **Free** plan.
2. Extract this package. Install a current Node.js version (22 or newer).
3. Open a terminal inside `somewhere-free` and run `npm ci` (Windows PowerShell: `npm.cmd ci`).
4. Run `npx wrangler login` (`npx.cmd wrangler login` on PowerShell). Sign in through Cloudflare's own browser window. Do not paste account tokens into chat.
5. Run `npm run deploy` (`npm.cmd run deploy` on PowerShell).
6. Wrangler creates the room service and publishes the assets. Open the HTTPS `workers.dev` URL it prints. Share this site URL with friends, then share a **private room invitation** with the people you want to admit.

The Cloudflare account may ask you to choose its `workers.dev` subdomain on first deployment. If the application name is already used in your account, change `name` in `wrangler.jsonc`. No custom domain or manually configured secret is needed.

The current public deployment is https://somewhere-guest-world.somewhere-free.workers.dev/. A GitHub copy does not automatically control that deployment; publish updates with `npm run deploy` after signing in to the intended Cloudflare account.

For local development only, run `npm run dev`. The server listens at `http://localhost:8787` or the address Wrangler prints. Use HTTPS for real visitors; browser encryption only allows insecure HTTP on loopback. Uploading just `public/` to a static host will not run private rooms.

## How private rooms work

1. Choose a nickname. You receive a random guest identity and an HttpOnly browser session cookie.
2. Create a room. Copy its complete private invitation, which includes a random admission secret and a browser-generated encryption key.
3. Friends enter as guests and ask to join. Check each person's **guest code**, not just their nickname, through a trusted conversation before approving them. Names are not verified.
4. Approve up to nine friends (ten people including you). Invitations expire after ten minutes. **Build & lock room** ends new joining immediately, including pending requests. Approved guests can reconnect from the same browser.
5. The cinema, avatar editor, road-following taxi, chair exits, map, movable chat, and optional media controls are included. The host selects supported media; each listener controls personal volume.

There is no short trial or paid time allowance. Browser guest credentials expire after seven days as a security measure. Ending a guest session, clearing cookies, or changing devices loses that identity. A replacement guest needs a new approval while joining is open; old locked rooms do not admit the replacement. Rooms inactive for seven days with nobody connected are cleaned up. Active rooms are not subject to that cleanup timer.

Keys and invitation copies live in `sessionStorage` for the current browser session. Save the full invitation privately if you want to reload/reconnect later with the same guest cookie. Opening it in another browser does not bypass host approval. Ending a guest session clears the app's stored room keys in that tab.

## What “secured” means here

- AES-256-GCM encryption happens in participants' browsers before sending chat, motion, gestures, and media controls. The relay receives ciphertext.
- Random invitation secrets, server-enforced approval/capacity/expiry/locking, origin checks, HttpOnly/SameSite cookies, HTTPS, message limits, and persistent API rate limits are implemented.
- No passwords or email addresses are collected. Third-party fonts were removed from this edition.
- Guest names, appearance profiles, room names/membership, network metadata and IP addresses are not end-to-end encrypted. Cloudflare operates the infrastructure.
- Video/audio files themselves are fetched from their source; room encryption covers playback commands, not the media bytes.
- **Not independently audited; no absolute-security promise.** There is no forward secrecy or key rotation, and web clients must trust the JavaScript served by the hosting account. Anyone given the room key could decrypt captured room packets; locking stops new server admissions but does not revoke a disclosed key. Close the room and create a new one if the invitation leaks. Approved participants can record or share content.
- Guest approval protects admission, not real-world identity. There is no recovery service, MFA, moderation service, participant removal/rekey, or anti-cheat system in this release.

Permitted direct videos play on the 3D screen; the bundled film is a ten-second licensed preview. The original ambient soundtrack works in the app. See `public/CREDITS.md`.

## License and assets

The repository is currently published as source available with no general reuse license granted. Third-party and bundled asset credits are listed in `public/CREDITS.md`. Open an issue before redistributing the project or its assets.

## Validation and files

`worker.js` is the Cloudflare backend; `public/` is the browser app; `wrangler.jsonc` configures deployment. Do not upload `node_modules`, `.wrangler`, local test data, or account tokens.

Start the local server on `127.0.0.1:8787`, then run `npm test`. API tests cover guest entry, cross-origin rejection, invalid invitation rejection, pending approval, host-only approval, ten-person capacity, locking, approved reconnection, logout, room closure, and encryption tamper/replay rejection. Browser testing uses three separate guest sessions for chat, avatars, shared cinema playback, chair exits, and mobile framing. See `VALIDATION.md` for deployment limits.

Live voice chat: open Voice chat, Join voice, and allow the microphone. Mute mic and Voice volume are independent of movie audio. Leaving voice or disconnecting stops microphone capture. Audio uses direct encrypted WebRTC connections with STUN; no recording or paid relay is configured. Some mobile/carrier/corporate networks will require TURN, which is not included. Peers can learn each other's network addresses through direct connections.

Media update: Activities now places the file chooser at the top in every venue. The host selects audio/video up to 50 MB; guests choose Receive. Common file extensions are recognized when the device omits its media type. Music controls also includes Choose audio / video. Streaming-provider placeholders have been removed. Expanded cinema chat uses a separate side panel on desktop and a lower panel on phones; closing chat restores the full movie view.

File picker: use Browse audio / video files or drop a file onto the media panel. The native file input remains available as a fallback. Guests receive a visible host-only explanation instead of a silently disabled picker.

Playback speed is fixed at 1x for music and movies. Synchronization no longer speeds up or slows down audio, and no longer adds a delay derived from differences between device clocks.

Video speed: normal speed is also reset explicitly on source selection, metadata load and seeking. The main script URL is versioned so refreshing loads the updated player.
