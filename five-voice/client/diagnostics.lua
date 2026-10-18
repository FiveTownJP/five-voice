if not FiveVoiceEnabled then return end

-- /fivevoicecheck : prints a short status report to chat and the F8 console. Handy for bug reports.
-- (A healthy report does not prove audio works - always test with two players.)
RegisterCommand('fivevoicecheck', function()
    local state = LocalPlayer.state
    local proximity = state.proximity or {}
    local report = {
        backend = GetCurrentResourceName(),
        mumbleConnected = MumbleIsConnected(),
        voiceMode = proximity.mode or 'not initialised',
        voiceIndex = proximity.index,
        proximity = MumbleGetTalkerProximity(),
        radioChannel = state.radioChannel or 0,
        callChannel = state.callChannel or 0,
        scene = state.fiveVoiceScene or '',
        nearbyMuted = state.fiveVoiceMuted == true,
        fullMuted = FiveVoiceFullMuted == true,
        lipSyncEnabled = GetConvarInt('five_voice_lipSync', 1) == 1,
    }
    print('[five-voice] ' .. json.encode(report))
    local ja = GetConvar('five_voice_locale', 'en') == 'ja'
    local text
    if ja then
        text = ('音声=%s / モード=%s / 無線=%s / 通話=%s / 周囲ミュート=%s / 完全ミュート=%s。詳細はF8。'):format(
            report.mumbleConnected and '接続' or '未接続', report.voiceMode, report.radioChannel,
            report.callChannel, tostring(report.nearbyMuted), tostring(report.fullMuted))
    else
        text = ('voice=%s / mode=%s / radio=%s / call=%s / nearby mute=%s / full mute=%s. See F8 for details.'):format(
            report.mumbleConnected and 'connected' or 'disconnected', report.voiceMode, report.radioChannel,
            report.callChannel, tostring(report.nearbyMuted), tostring(report.fullMuted))
    end
    TriggerEvent('chat:addMessage', { color = { 138, 79, 255 }, args = { 'five-voice', text } })
end, false)
