-- five-voice: a drop-in, standalone Mumble voice core based on pma-voice (MIT, see ../LICENSE-PMA-VOICE).
-- Set `setr five_voice_enabled false` to turn the whole resource off without removing it.
FiveVoiceEnabled = GetConvar('five_voice_enabled', 'true') == 'true'
if not FiveVoiceEnabled then return end

-- Never run two voice engines at once. `provide 'pma-voice'` resolves to us, so we tell ourselves
-- apart from a real pma-voice by the `name` metadata.
local legacyState = GetResourceState('pma-voice')
if (legacyState == 'started' or legacyState == 'starting')
    and GetResourceMetadata('pma-voice', 'name', 0) ~= 'five-voice' then
    FiveVoiceEnabled = false
    print('^1[five-voice] refusing to start: a real pma-voice is already running. Remove/stop pma-voice first.^7')
    return
end

-- `provide` alone does not carry over Lua export event names, so every export is registered under the
-- pma-voice name as well. Scripts that call exports['pma-voice']:xxx keep working unchanged.
local baseExports = exports
exports = setmetatable({}, {
    __index = function(_, resource) return baseExports[resource] end,
    __call = function(_, name, fn)
        baseExports(name, fn)
        AddEventHandler('__cfx_export_pma-voice_' .. name, function(setCallback)
            setCallback(fn)
        end)
    end,
})

-- Volume of the little UI feedback beeps (mute / unmute / mode change), 0.0 - 1.0. 0 = silent.
--   setr five_voice_feedbackVolume 0.02
function FiveVoiceFeedbackVolume()
    local v = tonumber(GetConvar('five_voice_feedbackVolume', '0.02')) or 0.02
    if v < 0.0 then v = 0.0 elseif v > 1.0 then v = 1.0 end
    return v
end
