fx_version 'cerulean'
game 'gta5'
name 'five-voice'
author 'FiveTown / based on pma-voice by AvarianKnight & contributors (MIT)'
version '1.0.0'
description 'Standalone Mumble voice core based on pma-voice, with full mute, lip sync and a minimal HUD'
lua54 'yes'
node_version '22'
dependency '/onesync'

shared_scripts { 'bootstrap.lua', 'engine/shared.lua' }
client_scripts {
 'client/mute.lua',
 'engine/client/utils/*',
 'engine/client/init/proximity.lua',
 'engine/client/init/init.lua',
 'engine/client/init/main.lua',
 'engine/client/init/submix.lua',
 'engine/client/module/*.lua',
 'engine/client/*.lua',
 'client/hudvisibility.lua',
 'client/cleanup.lua',
 'client/diagnostics.lua',
 'client/lipsync.lua',
}
server_scripts { 'engine/server/**/*.lua', 'engine/server/**/*.js' }
ui_page 'ui/index.html'
files { 'ui/index.html', 'ui/app.js', 'ui/app.css', 'ui/*.ogg', 'ui/*.svg' }

-- Drop-in replacement: resources that depend on / export to `pma-voice` resolve to five-voice.
-- Do NOT run the original pma-voice together with five-voice.
provide 'pma-voice'
