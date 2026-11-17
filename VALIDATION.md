# Verification

This edition was exercised locally in Cloudflare's workerd runtime through Wrangler, not just a substitute Node HTTP server.

- Automated HTTP tests passed for guest sessions, ten-member admission, invalid invitations, unauthorized approval, room locking/reconnection, logout and closing rooms.
- AES-GCM tests passed for successful decryption and rejection of tampering, wrong keys, forged sender identities and replayed packets.
- Three independent Chrome sessions passed guest entry, host approval, encrypted chat, avatar synchronization, shared video playback, cinema expansion, all 28 chair exits, mobile layout, and rejoining a locked room from the approved browser. No browser exceptions were observed.
- The new Free-plan service has not been deployed to a real Cloudflare account. Live TLS/domain routing, account quotas, real internet behavior and long-running load remain deployment checks.
- The ten-minute expiry value and server checks are implemented; this edition's browser test did not wait ten real minutes for expiry. The prior Node edition's time-injected expiry test is not claimed as a test of this Worker.
- No independent security audit. Free-tier availability is quota-limited. A nickname is not a verified identity; use the guest code and trusted communication to approve people.

Google/Facebook sign-in is intentionally deferred. No connection to those providers is claimed.

Voice chat: two isolated Chromium sessions with synthetic microphones exchanged inbound audio packets in both directions. Verified mute/unmute isolation, leave/rejoin and disconnect cleanup; zero page errors. Existing server admission and encryption tests passed. Real microphone acoustics, mobile browsers and cross-network NAT traversal remain unverified.

Media/cinema update: Chromium two-user test passed file-picker availability in all five venues, WAV selection with generic application/octet-stream type, encrypted file transfer and playback, personal mute and host pause/resume. Provider controls absent. Desktop 1280x720 and mobile 390x844 world/chat bounds do not overlap; mobile chat sends successfully; closing chat restores world width. No page exceptions.

Picker fix: real Chromium click on Browse emitted a filechooser event; choosing a WAV through that chooser transferred and played for a second member. Guest click showed the host-only explanation. Drag-and-drop loaded a second audio file. Existing shared playback and personal mute checks passed without page errors. Original deployed native input also emitted a chooser in Chrome; the user's exact device failure was not reproduced.

Speed fix: two Chromium sessions stayed at playbackRate=1; an injected rate of 2 reset to 1 on both clients. Six-second timing samples did not run ahead of wall time (allowing buffering). No page errors. Removed device-clock delay and playback-rate drift correction. Exact reported 2x cause was not reproduced.

Video follow-up: normal-speed resets now run on source selection, metadata and seeking, with guarded setters. Syntax passed. Two-browser tests observed rate=1, but video timeline verification failed because the fixture stalled at readyState=2 with paused=false, including without forced speed changes. Continuous video playback and pause/resume validation remain unverified; no claim of a passing end-to-end video test.

Native picker revision: replaced scripted showPicker with native label/file-input activation; permissions checked after selection. Chrome real-click test passed cancel/retry, selecting WAV, encrypted guest transfer/playback, guest explanation and drag/drop. Microsoft Edge automation failed at browser startup (pipe ended), so Edge is unverified. Versioned entrypoint and local-media import ensure new module loads. Original user-device failure remains unreproduced.
