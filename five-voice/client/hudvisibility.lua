if not FiveVoiceEnabled then return end

-- The voice UI is hidden while the pause menu is open, and can be hidden by other scripts:
--   exports['five-voice']:setHudHidden(true)       -- or TriggerEvent('five-voice:hud:setHidden', true)
-- If your framework has a "player is loaded" moment, you can start hidden with `setr five_voice_hudStartHidden true`
-- and call setHudHidden(false) once the player is in.
local paused = false
local hidden = GetConvar('five_voice_hudStartHidden', 'false') == 'true'

local function updateVisibility()
    SendNUIMessage({ fiveHudVisible = not paused and not hidden })
end

local function setHidden(value)
    hidden = value and true or false
    updateVisibility()
end
AddEventHandler('five-voice:hud:setHidden', setHidden)
exports('setHudHidden', setHidden)

CreateThread(function()
    updateVisibility()
    while true do
        local nowPaused = IsPauseMenuActive()
        if nowPaused ~= paused then
            paused = nowPaused
            updateVisibility()
        end
        Wait(300)
    end
end)

-- The UI asks for the current state when it finishes loading.
RegisterNUICallback('hudVisibilityReady', function(_, cb)
    updateVisibility()
    cb({ ok = true })
end)
