# five-voice

**English** | [日本語](README.ja.md)

**Never wonder "is my voice leaking?" again.** (In Japanese FiveM communities this is called 声貫通, "voice bleed-through": you think you are muted, but nearby players, the radio or your phone call can still hear you.)

A drop-in, standalone voice resource for FiveM built on top of **[pma-voice](https://github.com/AvarianKnight/pma-voice)** (MIT).
It keeps pma-voice's engine, exports, events and state bags, and adds the things servers keep asking for:

| Feature | What it does |
|---|---|
| **Full mute** | One key or `/fivemute` blocks **talking, radio and phone** transmit while you still hear everyone. A transparent red "mic off" icon is shown. It pins the Mumble voice target to an empty slot, so pressing PTT or the radio key can't bypass it. Great for streamers, real-life interruptions, AFK. |
| **Five-step voice range** | Mute → Whisper → Normal → Shout → Super shout, cycled with the usual key. "Mute" silences nearby talk only; radio / phone still work. |
| **Voice isolation** (`five-voice-isolate`) | Stops voice leaking between routing buckets (clothing shops, test drives, instanced interiors) and between named "scenes" (e.g. a warehouse work area) that other scripts can set. |
| **Lip sync** | Mouths follow the *actual* Mumble talking state, for you and everyone streamed in — not just "PTT pressed". |
| **Minimal HUD** | Voice range, radio channel, "on call" and the full-mute icon next to the minimap. No blur, transparent background. English / Japanese. |
| **Feedback beeps** | Short, quiet tones on mute / unmute / range change. Volume configurable (or off). |
| **Diagnostics** | `/fivevoicecheck` prints Mumble connection, mode, channels, scene and mute state to chat + F8. |

> **Status:** the audio engine is pma-voice's. The new parts are covered by automated logic tests (mocked natives), but real voice can
> only be verified in game. **Always test with two players** (talk, radio, phone, mute) before going live.

## Install

1. **Remove / stop the original `pma-voice`.** five-voice declares `provide 'pma-voice'`, so every script that depends on or calls
   `exports['pma-voice']` keeps working. Never run both (five-voice refuses to start if a real pma-voice is running).
2. Copy `five-voice/` (and optionally `five-voice-isolate/`) into your `resources` folder.
3. `server.cfg`:
   ```cfg
   ensure five-voice
   ensure five-voice-isolate   # optional

   # your usual pma-voice settings still apply, e.g.
   setr voice_useNativeAudio true

   # five-voice settings (all optional)
   setr five_voice_locale en              # en | ja
   setr five_voice_muteKey "F10"          # default key for full mute (empty = unassigned; players can rebind in the FiveM key settings)
   setr five_voice_feedbackVolume 0.02    # 0.0 - 1.0, 0 = silent
   setr five_voice_lipSync 1              # 0 disables lip sync
   setr five_voice_hudStartHidden false   # true = HUD stays hidden until you call setHudHidden(false)
   ```
   Use `setr` (replicated), not `set`, so clients see the value.
4. Players can rebind keys in **ESC → Settings → Key Bindings → FiveM** (*Voice: toggle full mute*).

`setr five_voice_enabled false` switches the whole resource off without removing it.

## Commands

| Command | |
|---|---|
| `/fivemute` | Toggle full mute (talk + radio + phone). Also a key binding. |
| `/fivevoicecheck` | Print a status report to chat + F8. Paste it into bug reports. |
| `/muteply <id> [seconds]` | Admin server-side mute (from pma-voice). |
| everything else | Same as pma-voice (`cycleproximity`, `+radiotalk`, `/vol`, `setvoiceintent` ...). |

## API

### five-voice (client)
```lua
exports['five-voice']:setFullMuted(true)   -- full mute on/off (talk + radio + phone); returns false if the value isn't a boolean
exports['five-voice']:isFullMuted()        -- boolean
exports['five-voice']:setHudHidden(true)   -- hide / show the voice HUD (or TriggerEvent('five-voice:hud:setHidden', true))
```
Full mute lives in `LocalPlayer.state.fiveVoiceFullMuted` (local, not replicated). The HUD hides itself while the pause menu is open.

pma-voice's own `setMuted` export is kept as a **nearby-talk-only** mute for compatibility. Use `setFullMuted` when radio and phone must be muted too.

All pma-voice exports / events / state bags (`proximity`, `radioChannel`, `callChannel`, `pma-voice:*` ...) are unchanged — see the
[pma-voice docs](https://github.com/AvarianKnight/pma-voice).

### five-voice-isolate
```lua
-- client
exports['five-voice-isolate']:setScene('warehouse')   -- only people in the same scene hear each other; nil clears it
exports['five-voice-isolate']:setMuted(true)          -- my nearby voice reaches nobody (radio / phone unaffected)
-- server
exports['five-voice-isolate']:setScene(src, 'warehouse')
exports['five-voice-isolate']:setMuted(src, true)
```
State bags: `fiveBucket` (routing bucket, automatic), `fiveVoiceScene`, `fiveVoiceMuted`.
It also works on top of stock pma-voice: set `dependency 'pma-voice'` in its manifest and `setr five_voice_isolate_backend pma-voice`.
Radio / phone channels are not isolated (by design). `setr five_voice_isolate_enabled false` turns it off.

## How full mute works (and its limits)

pma-voice decides who hears you by building a Mumble *voice target*. five-voice wraps `MumbleSetVoiceTarget` so that while muted the
target is always **#30, an empty reserved slot**. Whatever the radio / phone / proximity code does, your voice has nobody to go to.
Receiving, channel membership and volumes are untouched. It does **not** stop your microphone, change Windows settings, or affect Discord and other apps.

## Differences from stock pma-voice

* Resource name `five-voice`, with `provide 'pma-voice'`.
* Added: full mute, lip sync, HUD (own NUI; pma-voice's UI is not used), feedback beeps, `/fivevoicecheck`, `five-voice-isolate`.
* Everything under `engine/` is pma-voice's code (comments translated, a few hooks added), so upstream fixes can be merged by diffing that folder.

## Tests

```bash
cd five-voice/tests && npm install && npm test
```
The tests run the real Lua files against mocked FiveM natives (fengari). They do not replace an in-game check.

## Support

**Provided as-is, with no support.** The authors do not answer setup questions or promise fixes or updates.
This is a starting point: fork it, change it, and adapt it to your own server. Pull requests are welcome but may not get a reply.

## Credits & license

* Voice engine: **[pma-voice](https://github.com/AvarianKnight/pma-voice)** by AvarianKnight and contributors (MIT) — see `LICENSE-PMA-VOICE`.
* five-voice additions: © FiveTown, MIT — see `LICENSE`.

Made at **FiveTown**, a Japanese FiveM server. Issues, ideas and PRs are very welcome — if you build something better on top of it, tell us!
