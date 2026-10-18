-- five-voice-isolate (client)
--
-- Replaces the engine's "who should hear me" check (overrideProximityCheck) with one that adds:
--   1. same routing bucket only (people moved to another bucket neither hear nor are heard)
--   2. same fiveVoiceScene only (named spaces, e.g. a warehouse work area)
--   3. if I am fiveVoiceMuted, my nearby voice reaches nobody
--   4. distance is the same as stock pma-voice
-- Radio / phone channels are not affected. The engine's own files are never modified.

if GetConvar('five_voice_isolate_enabled', 'true') ~= 'true' then return end

local backend = GetConvar('five_voice_isolate_backend', 'five-voice')

local function sceneOf(state) return (state and state.fiveVoiceScene) or '' end
local function bucketOf(state) return (state and state.fiveBucket) or 0 end

local function proximityCheck(ply)
    local mine = LocalPlayer.state
    if mine.fiveVoiceMuted then return false, 0.0 end

    local ped = GetPlayerPed(ply)
    if ped == 0 then return false, 0.0 end

    local theirs = Player(GetPlayerServerId(ply)).state
    if bucketOf(theirs) ~= bucketOf(mine) then return false, 0.0 end
    if sceneOf(theirs) ~= sceneOf(mine) then return false, 0.0 end

    -- same distance rule as stock pma-voice (native audio uses 3x range)
    local proximity = MumbleGetTalkerProximity()
    local range = GetConvar('voice_useNativeAudio', 'false') == 'true' and proximity * 3 or proximity
    local distance = #(GetEntityCoords(PlayerPedId()) - GetEntityCoords(ped))
    return distance < range, distance
end

local function install()
    if GetResourceState(backend) ~= 'started' then return end
    exports[backend]:overrideProximityCheck(proximityCheck)
end

CreateThread(function()
    local waited = 0
    while GetResourceState(backend) ~= 'started' and waited < 30000 do
        Wait(500)
        waited = waited + 500
    end
    install()
end)

-- if the voice engine restarts, install the check again
AddEventHandler('onClientResourceStart', function(res)
    if res == backend then
        Wait(1000)
        install()
    end
end)

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then
        if GetResourceState(backend) == 'started' then exports[backend]:resetProximityCheck() end
        LocalPlayer.state:set('fiveVoiceMuted', false, true)
        LocalPlayer.state:set('fiveVoiceScene', nil, true)
    end
end)

-- Client-side exports for other resources:
--   exports['five-voice-isolate']:setScene('warehouse')  -- same name = can hear each other. nil clears it
--   exports['five-voice-isolate']:setMuted(true)         -- my nearby voice reaches nobody (radio / phone still work)
-- For a mute that also blocks radio / phone, use five-voice's full mute: exports['five-voice']:setFullMuted(true)
exports('setScene', function(name)
    if name ~= nil and type(name) ~= 'string' then return false end
    LocalPlayer.state:set('fiveVoiceScene', name, true)
    return true
end)

exports('setMuted', function(muted)
    LocalPlayer.state:set('fiveVoiceMuted', muted == true, true)
    return true
end)
