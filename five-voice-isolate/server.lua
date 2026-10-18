-- five-voice-isolate (server)
-- Publishes where every player is, via state bags, so clients can decide who should hear whom.
--   fiveBucket     : routing bucket (automatic; covers clothing shops, test drives, interiors that use buckets)
--   fiveVoiceScene : a named space set by other scripts. Only people in the same scene hear each other.
--   fiveVoiceMuted : when true, this player's nearby voice reaches nobody

if GetConvar('five_voice_isolate_enabled', 'true') ~= 'true' then
    print('[five-voice-isolate] disabled (five_voice_isolate_enabled is not true)')
    return
end

local CHECK_MS = 500
local last = {}

CreateThread(function()
    while true do
        for _, id in ipairs(GetPlayers()) do
            local src = tonumber(id)
            local bucket = GetPlayerRoutingBucket(src)
            if last[src] ~= bucket then
                last[src] = bucket
                Player(src).state:set('fiveBucket', bucket, true)
            end
        end
        Wait(CHECK_MS)
    end
end)

AddEventHandler('playerDropped', function()
    last[source] = nil
end)

-- Server-side exports for other resources:
--   exports['five-voice-isolate']:setScene(src, 'warehouse')  -- same name = can hear each other. nil clears it
--   exports['five-voice-isolate']:setMuted(src, true)         -- that player's nearby voice reaches nobody
exports('setScene', function(src, name)
    if not GetPlayerName(src) then return false end
    if name ~= nil and type(name) ~= 'string' then return false end
    Player(src).state:set('fiveVoiceScene', name, true)
    return true
end)

exports('setMuted', function(src, muted)
    if not GetPlayerName(src) then return false end
    Player(src).state:set('fiveVoiceMuted', muted == true, true)
    return true
end)
