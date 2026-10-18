if not FiveVoiceEnabled then return end

-- Lip sync: only follows actual Mumble talking state (pressing PTT alone does nothing).
-- Every client animates the streamed-in players locally; no extra network traffic is added.
local animated = {}
local function enabled()
    return GetConvarInt('five_voice_lipSync', 1) == 1
end

local function release(player, entry)
    -- Do not touch someone else's face after a character change / reuse of a player index or ped handle.
    if NetworkIsPlayerActive(player)
        and GetPlayerServerId(player) == entry.serverId
        and GetPlayerPed(player) == entry.ped
        and DoesEntityExist(entry.ped)
        and GetEntityModel(entry.ped) == entry.model then
        PlayFacialAnim(entry.ped, 'mood_normal_1', 'facials@gen_male@variations@normal')
    end
    animated[player] = nil
end

local function update()
    local seen = {}
    local players = GetActivePlayers()
    players[#players + 1] = PlayerId() -- Include yourself even when alone.
    local connected = MumbleIsConnected()
    connected = connected == true or connected == 1
    local active = enabled() and connected
    if active then
        -- Avoid playing from a dictionary that has not loaded yet.
        for _, dict in ipairs({'mp_facial', 'facials@gen_male@variations@normal'}) do
            if not HasAnimDictLoaded(dict) then RequestAnimDict(dict) end
        end
        active = HasAnimDictLoaded('mp_facial')
            and HasAnimDictLoaded('facials@gen_male@variations@normal')
    end
    for _, player in ipairs(players) do
        if not seen[player] then
            seen[player] = true
            local ped = GetPlayerPed(player)
            local valid = NetworkIsPlayerActive(player) and ped ~= 0 and DoesEntityExist(ped)
            local serverId = valid and GetPlayerServerId(player) or -1
            local model = valid and GetEntityModel(ped) or 0
            local entry = animated[player]
            if entry and (entry.ped ~= ped or entry.serverId ~= serverId or entry.model ~= model) then
                release(player, entry)
                entry = nil
            end
            local talking = active and valid and not IsPedDeadOrDying(ped, true)
                and not (player == PlayerId() and FiveVoiceFullMuted)
                and MumbleIsPlayerTalking(player)
            talking = talking == true or talking == 1 -- 0 is truthy in Lua, so compare explicitly.
            if talking and not entry then
                PlayFacialAnim(ped, 'mic_chatter', 'mp_facial')
                animated[player] = {ped = ped, model = model, serverId = serverId}
            elseif not talking and entry then
                release(player, entry)
            end
        end
    end
    for player, entry in pairs(animated) do
        if not seen[player] then release(player, entry) end
    end
end

CreateThread(function()
    while true do
        update()
        Wait(100)
    end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    for player, entry in pairs(animated) do release(player, entry) end
end)
