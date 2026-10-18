# five-voice

[English](README.md) | **日本語**

**[pma-voice](https://github.com/AvarianKnight/pma-voice)**（MIT）をベースにした、FiveM用の独立ボイスリソースです。
pma-voiceのエンジン・exports・イベント・ステートバッグはそのまま使えて、「あったらいいのに」を足してあります。

| 機能 | 内容 |
|---|---|
| **完全ミュート** | キー、または`/fivemute`で、**会話・無線・電話**の送信をまとめて止めます（相手の声は聞こえます）。画面には透過の赤い「マイクOFF」アイコンを表示。Mumbleの送信先を空の枠に固定する方式なので、PTTや無線キーを押しても解除されません。配信中・離席・突然の来客に。 |
| **声量5段階** | ミュート → 小声 → 普通 → 大声 → 咆哮。いつものキーで切り替え。「ミュート」は近くへの会話だけを止めます（無線・電話は使えます）。 |
| **声漏れ防止**（`five-voice-isolate`） | ルーティングバケット（服装屋・試乗・インスタンス内部）をまたいだ声漏れを防ぎます。他のスクリプトが指定できる名前つきの「scene」（例: 倉庫の作業場）でも、同じ名前の人どうしだけに声が届きます。 |
| **リップシンク** | キー押下ではなく、**実際にMumbleで話している状態**に口が連動します（自分も周りの人も）。 |
| **ミニマルなHUD** | 声量・無線チャンネル・通話中・完全ミュートのアイコンを、ミニマップの横に表示。ぼかしなし・背景透過。日本語/英語。 |
| **操作音** | ミュート/解除/声量切替の、小さな短い音。音量は変更・無効化できます。 |
| **診断** | `/fivevoicecheck`で、Mumble接続・モード・チャンネル・scene・ミュートの状態をチャットとF8に出します。 |

> **ご注意:** 音声エンジンはpma-voiceのものです。追加部分は、FiveMのネイティブを模したモックで、ロジックを自動テストしています。
> ただし実際の音声はゲーム内でしか確認できません。**本番に入れる前に、必ず2人で（会話・無線・電話・ミュート）確認してください。**

## 導入

1. **元の`pma-voice`は外す（停止する）**。five-voiceは`provide 'pma-voice'`を持つので、`exports['pma-voice']`を使う既存スクリプトはそのまま動きます。
   両方を同時に動かすことはできません（本物のpma-voiceが動いていると、five-voiceは起動を拒否します）。
2. `five-voice/`（必要なら`five-voice-isolate/`も）を`resources`に入れる。
3. `server.cfg`:
   ```cfg
   ensure five-voice
   ensure five-voice-isolate   # 任意

   # 今までのpma-voiceの設定は、そのまま有効
   setr voice_useNativeAudio true

   # five-voiceの設定（すべて任意）
   setr five_voice_locale ja              # en | ja
   setr five_voice_muteKey "F10"          # 完全ミュートの初期キー（空なら未割り当て。プレイヤーがFiveMのキー設定で変更できます）
   setr five_voice_feedbackVolume 0.02    # 0.0〜1.0、0で無音
   setr five_voice_lipSync 1              # 0でリップシンクを無効化
   setr five_voice_hudStartHidden false   # trueなら、setHudHidden(false)を呼ぶまでHUDを隠す
   ```
   クライアントにも値を届けるため、`set`ではなく`setr`を使います。
4. プレイヤーは、**ESC → 設定 → キー割り当て → FiveM**の「ボイス: 完全ミュート切替」で、キーを決められます。

`setr five_voice_enabled false`で、リソースを外さずに、全体を無効にできます。

## コマンド

| コマンド | |
|---|---|
| `/fivemute` | 完全ミュートの切替（会話・無線・電話）。キー割り当ても可能。 |
| `/fivevoicecheck` | 状態をチャットとF8に表示。不具合報告に貼れます。 |
| `/muteply <id> [秒]` | 管理者用のサーバー側ミュート（pma-voice由来）。 |
| その他 | pma-voiceと同じ（`cycleproximity`、`+radiotalk`、`/vol`、`setvoiceintent` ...）。 |

## API

### five-voice（クライアント）
```lua
exports['five-voice']:setFullMuted(true)   -- 完全ミュートのON/OFF（会話・無線・電話）。boolean以外はfalseを返す
exports['five-voice']:isFullMuted()        -- boolean
exports['five-voice']:setHudHidden(true)   -- 音声HUDの表示/非表示（TriggerEvent('five-voice:hud:setHidden', true)でも可）
```
完全ミュートは`LocalPlayer.state.fiveVoiceFullMuted`（ローカルのみ、同期しない）に入ります。ポーズメニュー中はHUDが自動で隠れます。

pma-voiceの`setMuted`は、互換性のため**近接の会話だけ**のミュートのままです。無線・電話も止めたいときは`setFullMuted`を使います。

pma-voiceのexports・イベント・ステートバッグ（`proximity`・`radioChannel`・`callChannel`・`pma-voice:*`など）は変更していません。
詳細は[pma-voiceのドキュメント](https://github.com/AvarianKnight/pma-voice)を参照してください。

### five-voice-isolate
```lua
-- クライアント
exports['five-voice-isolate']:setScene('warehouse')   -- 同じsceneの人どうしだけ声が届く。nilで解除
exports['five-voice-isolate']:setMuted(true)          -- 自分の近接の声を誰にも届けない（無線・電話は対象外）
-- サーバー
exports['five-voice-isolate']:setScene(src, 'warehouse')
exports['five-voice-isolate']:setMuted(src, true)
```
ステートバッグ: `fiveBucket`（ルーティングバケット、自動）、`fiveVoiceScene`、`fiveVoiceMuted`。
本物のpma-voiceの上でも動きます（マニフェストの`dependency`を`'pma-voice'`にして、`setr five_voice_isolate_backend pma-voice`）。
無線・電話のチャンネルは、仕様として分離対象外です。`setr five_voice_isolate_enabled false`で無効にできます。

## 完全ミュートの仕組みと限界

pma-voiceは、Mumbleの「ボイスターゲット」を作って、誰に声を届けるかを決めています。five-voiceは`MumbleSetVoiceTarget`を包んで、
ミュート中は常に**空の予約枠（#30）**へ向けます。無線・電話・近接のどの処理が走っても、声の届け先がありません。
受信・チャンネルへの所属・音量は変えません。**マイク自体を止めたり、Windowsの設定を変えたり、Discordなど他のアプリに作用したりはしません。**

## 標準のpma-voiceとの違い

* リソース名は`five-voice`。`provide 'pma-voice'`を持つ。
* 追加: 完全ミュート、リップシンク、HUD（独自のNUI。pma-voiceのUIは使わない）、操作音、`/fivevoicecheck`、`five-voice-isolate`。
* `engine/`配下は、pma-voiceのコードです（コメントを翻訳し、いくつかのフックを追加）。上流の修正は、このフォルダを比較して取り込めます。

## テスト

```bash
cd five-voice/tests && npm install && npm test
```
実際のLuaファイルを、FiveMネイティブのモックに対して動かします（fengari）。ゲーム内確認の代わりにはなりません。

## サポートについて

**現状のまま提供し、サポートは行いません。** 導入の質問への回答、修正、アップデートは約束しません。
これは出発点です。フォークして、自由に改良し、ご自身のサーバーに合わせて使ってください。PRは歓迎しますが、返信できない場合があります。

## クレジットとライセンス

* 音声エンジン: **[pma-voice](https://github.com/AvarianKnight/pma-voice)**（AvarianKnight と貢献者、MIT）— `LICENSE-PMA-VOICE`を参照。
* five-voiceの追加部分: © FiveTown、MIT — `LICENSE`を参照。

日本のFiveMサーバー**FiveTown**で作りました。Issue・アイデア・PR歓迎です。これをもとに、もっと良いものを作ったら、ぜひ教えてください。
