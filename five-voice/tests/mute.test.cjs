const {test}=require('node:test'),fs=require('node:fs'),path=require('node:path');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
function run(body,setup='',files=['client/mute.lua']){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const boot=`
FiveVoiceEnabled=true
S={events={},callbacks={},exports={},messages={},targets={},cleared={},commands={},threads={},proximity=0}
LocalPlayer={state={radioChannel=911,callChannel=77}}
function LocalPlayer.state:set(k,v)self[k]=v end
function MumbleSetVoiceTarget(t)S.targets[#S.targets+1]=t end
function MumbleClearVoiceTarget(t)S.cleared[#S.cleared+1]=t end
function SendNUIMessage(m)S.messages[#S.messages+1]=m end
function sendUIMessage(m)SendNUIMessage(m)end
function ExecuteCommand(c)S.commands[#S.commands+1]=c end
function AddEventHandler(k,f)S.events[k]=f end
function RegisterNUICallback(k,f)S.callbacks[k]=f end
function RegisterCommand(k,f)S[k]=f end
function RegisterKeyMapping()end
function CreateThread(f)S.threads[#S.threads+1]=f end
function GetCurrentResourceName()return 'five-voice'end
function GetConvarInt(k,d)return d end
function GetConvar(k,d)return d end
function TriggerEvent()end
function MumbleSetTalkerProximity(d)S.proximity=d end
function type_check()end
function exports(k,f)S.exports[k]=f end
`;
 try{for(const chunk of [boot+setup,...files.map(f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8').replace(/`([^`]+)`/g,'0')),body])if(lauxlib.luaL_dostring(L,to_luastring(chunk))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));}finally{lua.lua_close(L);}
}
test('full mute disabled core does not hook targets or expose APIs',()=>run('assert(next(S.exports)==nil and #S.threads==0)','FiveVoiceEnabled=false'));
test('full mute uses empty legal target30; does not disconnect receivers or alter channels',()=>run(`
MumbleSetVoiceTarget(1);assert(S.targets[1]==1)
assert(FiveVoiceSetFullMute(true));assert(S.targets[2]==30 and S.cleared[1]==30)
assert(S.commands[1]=='-radiotalk' and LocalPlayer.state.fiveVoiceFullMuted)
assert(LocalPlayer.state.radioChannel==911 and LocalPlayer.state.callChannel==77)
MumbleSetVoiceTarget(2);assert(S.targets[3]==30) -- 再接続/初期化でも送信先が開かない
assert(FiveVoiceSetFullMute(false));assert(S.targets[4]==2)
assert(S.messages[1].voiceFeedback=='mute' and S.messages[2].voiceFeedback=='unmute')
`));
test('full mute is idempotent, validates values, and UI readiness has no toggle sound',()=>run(`
assert(not FiveVoiceSetFullMute('true'));assert(FiveVoiceSetFullMute(false));assert(#S.targets==0)
FiveVoiceSetFullMute(true);FiveVoiceSetFullMute(true);assert(#S.targets==1)
S.callbacks.muteUiReady({},function(r)assert(r.ok)end)
assert(S.messages[2].fullMuted and not S.messages[2].voiceFeedback)
`));
test('full mute retained over resource reload and indicator reinitializes',()=>run(`
assert(FiveVoiceFullMuted);S.events.onClientResourceStart('other');assert(#S.targets==0)
S.events.onClientResourceStart('five-voice');assert(S.targets[1]==30 and S.messages[1].fullMuted)
`,'LocalPlayer.state.fiveVoiceFullMuted=true'));
test('cycle has five stages, releases full mute, retains legacy mode indices',()=>run(`
FiveVoiceSetFullMute(true);S.cycleproximity();assert(mode==1 and not FiveVoiceFullMuted and S.proximity==1.5)
S.cycleproximity();assert(mode==2);S.cycleproximity();assert(mode==3)
S.cycleproximity();assert(mode==4);S.cycleproximity();assert(mode==5)
assert(S.messages[#S.messages].voiceFeedback=='mute')
`,'mode=5;Cfg={voiceModes={{1.5,"Whisper"},{3,"Normal"},{6,"Shouting"},{10,"Super Shout"},{0.01,"Mute"}}};gameVersion="test"',['client/mute.lua','engine/client/commands.lua']));
test('disabled voice cycling does not silently release full mute',()=>run(`FiveVoiceSetFullMute(true);disableProximityCycle=true;S.cycleproximity();assert(FiveVoiceFullMuted and mode==5)`,'mode=5;Cfg={};gameVersion="test"',['client/mute.lua','engine/client/commands.lua']));
test('proximity Mute removes even own channel while preserving phone targets and listeners',()=>run(`
addNearbyPlayers();assert(#S.channels==1 and S.channels[1]==122 and S.listen==10)
mode=1;addNearbyPlayers();assert(#S.channels==2 and S.channels[1]==10 and S.channels[2]==122)
`,String.raw`
mode=5;Cfg={voiceModes={{1.5,"Whisper"},{3,"Normal"},{6,"Shouting"},{10,"Super Shout"},{0.01,"Mute"}}}
callData={[22]=true};voiceTarget=1;LocalPlayer.state.assignedChannel=10
function GetEntityCoords()return 0 end
function PlayerPedId()return 10 end
function MumbleGetTalkerProximity()return .01 end
function MumbleClearVoiceTargetChannels()S.channels={}end
function MumbleAddVoiceChannelListen(c)S.listen=c end
function MumbleAddVoiceTargetChannel(t,c)S.channels[#S.channels+1]=c end
function MumbleGetVoiceChannelFromServerId(id)return id+100 end
function GetActivePlayers()return {}end
function RegisterNetEvent()end
`,['engine/client/init/proximity.lua']));
