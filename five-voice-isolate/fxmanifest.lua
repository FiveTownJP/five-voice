fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'five-voice-isolate'
author 'FiveTown'
description 'Optional add-on for five-voice (or pma-voice): stop voice leaking between routing buckets and named "scenes"'
version '1.0.0'

dependency 'five-voice' -- works with a real pma-voice too: change this to 'pma-voice' and set `setr five_voice_isolate_backend pma-voice`

client_script 'client.lua'
server_script 'server.lua'
