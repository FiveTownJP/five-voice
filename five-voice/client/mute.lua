if not FiveVoiceEnabled then return end

-- Full mute never touches the input device or Windows settings: it just pins the voice target to an empty,
-- reserved target. Target 0 would mean "normal channel send" so it is not used. Valid range is 0..30.
local silentTarget = 30
local nativeSetTarget = MumbleSetVoiceTarget
local requestedTarget = 1
FiveVoiceFullMuted = LocalPlayer.state.fiveVoiceFullMuted == true

function MumbleSetVoiceTarget(target)
    requestedTarget = target
    if FiveVoiceFullMuted then
        MumbleClearVoiceTarget(silentTarget)
        nativeSetTarget(silentTarget)
    else
        nativeSetTarget(target)
    end
end

local function updateIndicator(feedback)
    SendNUIMessage({fullMuted=FiveVoiceFullMuted, voiceFeedback=feedback, feedbackVolume = FiveVoiceFeedbackVolume and FiveVoiceFeedbackVolume() or nil, locale=GetConvar('five_voice_locale','en')})
end

function FiveVoiceSetFullMute(muted, feedback)
    if type(muted) ~= 'boolean' then return false end
    if FiveVoiceFullMuted == muted then return true end
    FiveVoiceFullMuted = muted
    LocalPlayer.state:set('fiveVoiceFullMuted', muted, false)
    MumbleSetVoiceTarget(requestedTarget)
    if muted then
        -- Also release an in-progress radio transmission. Receiving and channel membership are kept.
        ExecuteCommand('-radiotalk')
    end
    updateIndicator(feedback ~= false and (muted and 'mute' or 'unmute') or nil)
    return true
end
exports('setFullMuted', FiveVoiceSetFullMute)
exports('isFullMuted', function() return FiveVoiceFullMuted end)

AddEventHandler('onClientResourceStart', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if FiveVoiceFullMuted then MumbleSetVoiceTarget(requestedTarget) end
    updateIndicator()
end)
RegisterNUICallback('muteUiReady', function(_, cb)
    updateIndicator()
    cb({ok=true})
end)

CreateThread(function()
    while true do
        if FiveVoiceFullMuted then
            -- Pressing push-to-talk / the radio key does not lift the mute. The empty target is the real block.
            DisableControlAction(0, 249, true)
            DisableControlAction(1, 249, true)
            DisableControlAction(2, 249, true)
            Wait(0)
        else
            Wait(100)
        end
    end
end)

-- /fivemute and an (unassigned by default) key binding. Set a default with: setr five_voice_muteKey "F10"
RegisterCommand('fivemute', function()
    FiveVoiceSetFullMute(not FiveVoiceFullMuted)
end, false)
RegisterKeyMapping('fivemute', GetConvar('five_voice_locale', 'en') == 'ja' and 'ボイス: 完全ミュート切替' or 'Voice: toggle full mute', 'keyboard', GetConvar('five_voice_muteKey', ''))
