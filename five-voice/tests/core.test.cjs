const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');const parse=require('luaparse');
const dir=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(dir,p),'utf8').replace(/^\uFEFF/,'');
const boot=String.raw`
S={enabled=true,legacy='stopped',metadata=nil,events={},exports={},threads={},players={},sent={}}
function GetConvar(name,default) if name=='five_voice_enabled' then return S.enabled and 'true' or 'false' end return default end
function GetConvarInt(name,default) return default end
function GetResourceState(name) if name=='pma-voice' then return S.legacy end return 'started' end
function GetResourceMetadata() return S.metadata end
function GetCurrentResourceName() return 'five-voice' end
function GetInvokingResource() return 'some_radio_script' end
function GetGameName() return 'fivem' end
function IsDuplicityVersion() return true end
function AddEventHandler(name,fn) S.events[name]=fn end
function RegisterNetEvent(name,fn) S.events[name]=fn end
exports=setmetatable({}, {__call=function(_,name,fn)S.exports[name]=fn end,__index=function(_,name)return S.exports end})
function CreateThread(fn)S.threads[#S.threads+1]=fn end
function Wait()end
function GetPlayers()return {} end
function GetPlayerName(id)return 'player-'..id end
function Player(id)
 if not S.players[id]then
  local state={};function state:set(key,value)self[key]=value end
  S.players[id]={state=state}
 end
 return S.players[id]
end
LocalPlayer=Player(1)
function TriggerClientEvent(name,src,...)S.sent[#S.sent+1]={name,src,...}end
function TriggerClientEventInternal(name,src,...)S.sent[#S.sent+1]={name,src,...}end
function TriggerServerEvent(name,...)S.sent[#S.sent+1]={name,...}end
function TriggerEvent()end
msgpack={pack_args=function(...)return 'payload'end}
function SetConvarReplicated()end
`;
function run(parts,body,setup=''){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 for(const chunk of [boot+'\n'+setup,...parts.map(read),body]){
  const code=chunk.replace(/`([^`]+)`/g,'0');
  const rc=lauxlib.luaL_dostring(L,to_luastring(code));if(rc!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));
 }
 lua.lua_close(L);
}
const server=['bootstrap.lua','engine/shared.lua','engine/server/main.lua','engine/server/module/phone.lua','engine/server/module/radio.lua'];
test('default OFF: all engine Lua files are inert',()=>{
 const all=[];function walk(p){for(const ent of fs.readdirSync(path.join(dir,p),{withFileTypes:true})){const name=path.posix.join(p,ent.name);if(ent.isDirectory())walk(name);else if(name.endsWith('.lua'))all.push(name);}}walk('engine');
 run(['bootstrap.lua',...all],'assert(next(S.exports)==nil);assert(next(S.events)==nil);assert(#S.threads==0)','S.enabled=false');
});
test('refuses legacy pma engine but accepts its own provider alias',()=>{
 run(server,'assert(not FiveVoiceEnabled);assert(next(S.exports)==nil)',"S.legacy='started'");
 run(server,'assert(FiveVoiceEnabled);assert(S.exports.setPlayerRadio)',"S.legacy='started';S.metadata='five-voice'");
});
test('legacy exports explicitly forward the exact function and results',()=>run(['bootstrap.lua'],`
exports('example',function(n)return n+1,'ok'end)
local callback;S.events['__cfx_export_pma-voice_example'](function(fn)callback=fn end)
assert(callback==S.exports.example);local n,s=callback(4);assert(n==5 and s=='ok')
`));
test('actual core phone server joins, changes call, leaves and clears state',()=>run(server,`
S.exports.setPlayerCall(1,41);S.exports.setPlayerCall(2,41)
assert(callData[41][1] and callData[41][2]);assert(Player(1).state.callChannel==41)
S.exports.setPlayerCall(1,42);assert(not callData[41][1]);assert(callData[42][1])
S.exports.setPlayerCall(1,0);assert(not callData[42][1]);assert(voiceData[1].call==0);assert(Player(1).state.callChannel==0)
`));
test('actual restricted radio denies unauthorized player; list and leave match',()=>run(server,`
local check=setmetatable({__cfx_functionReference='test'}, {__call=function(_,src)return src==2 end})
S.exports.addChannelCheck(911,check)
S.exports.setPlayerRadio(1,911);assert(Player(1).state.radioChannel==0)
S.exports.setPlayerRadio(2,911);assert(Player(2).state.radioChannel==911)
assert(S.exports.getPlayersInRadioChannel(911)[2]==false)
source=2;setTalkingOnRadio(true);assert(S.exports.getPlayersInRadioChannel(911)[2]==true)
S.exports.setPlayerRadio(2,0);assert(next(S.exports.getPlayersInRadioChannel(911))==nil)
`));
test('disconnect clears both radio and call memberships',()=>run(server,`
S.exports.setPlayerRadio(1,5);S.exports.setPlayerCall(1,6)
source=1;S.events.playerDropped();assert(not voiceData[1]);assert(not callData[6][1]);assert(not radioData[5][1])
`));
test('Lua syntax and manifest production/development separation',()=>{
 function walk(p){for(const ent of fs.readdirSync(path.join(dir,p),{withFileTypes:true})){const name=path.posix.join(p,ent.name);if(ent.isDirectory())walk(name);else if(name.endsWith('.lua'))parse.parse(read(name).replace(/`([^`]+)`/g,'0'),{luaVersion:'5.3'});}}walk('engine');parse.parse(read('bootstrap.lua'),{luaVersion:'5.3'});
assert.match(read('fxmanifest.lua'),/^provide 'pma-voice'/m);
 assert.match(read('bootstrap.lua'),/GetConvar\('five_voice_enabled', 'true'\)/);
});
test('all known consumer export names exist in copied compatibility engine',()=>{
 const text=['engine/server/main.lua','engine/server/module/phone.lua','engine/server/module/radio.lua','engine/client/init/main.lua','engine/client/init/proximity.lua','engine/client/module/phone.lua','engine/client/module/radio.lua','engine/client/commands.lua'].map(read).join('\n');
 for(const name of ['setPlayerRadio','addChannelCheck','removeChannelCheck','getPlayersInRadioChannel','setCallVolume','addPlayerToCall','removePlayerFromCall','setRadioVolume','setRadioChannel','setVoiceProperty','getMutedPlayers','toggleMutePlayer','overrideProximityCheck','resetProximityCheck'])assert.match(text,new RegExp(`exports\\(['"]${name}['"]`),name);
 assert.ok(fs.existsSync(path.join(dir,'..','LICENSE-PMA-VOICE')));
});

const clientSetup=String.raw`
function no()return 0 end
CreateAudioSubmix=no;SetAudioSubmixEffectRadioFx=no;SetAudioSubmixEffectParamInt=no;SetAudioSubmixOutputVolumes=no;AddAudioSubmixOutput=no;GetHashKey=no
SetAudioSubmixEffectParamFloat=no;RegisterKeyMapping=no;RegisterCommand=no
function sendUIMessage(m)S.ui=m end
playerServerId=1;voiceTarget=1;LocalPlayer.state.disableRadio=0
`;
const client=['bootstrap.lua','engine/shared.lua','engine/client/init/main.lua','engine/client/module/phone.lua','engine/client/module/radio.lua'];
test('full mute blocks radio PTT before activating radio or changing targets',()=>run(client,`
FiveVoiceFullMuted=true;S.commands['+radiotalk']();assert(not radioPressed and #S.sent==0)
`,clientSetup+`\nS.commands={};function RegisterCommand(k,f)S.commands[k]=f end`));
test('actual client call APIs used by phone resources emit compatible channel requests',()=>run(client,`
S.exports.setCallVolume(25);assert(S.exports.getCallVolume()==25)
S.exports.addPlayerToCall(77);assert(S.sent[#S.sent][1]=='pma-voice:setPlayerCall');assert(S.sent[#S.sent][2]==77)
S.exports.removePlayerFromCall();assert(S.sent[#S.sent][2]==0)
`,clientSetup));
test('actual client radio APIs used by radio resources keep volume and channel compatibility',()=>run(client,`
S.exports.setRadioVolume(35);assert(S.exports.getRadioVolume()==35)
S.exports.setRadioChannel(911);assert(S.sent[#S.sent][1]=='pma-voice:setPlayerRadio');assert(S.sent[#S.sent][2]==911)
S.exports.setRadioChannel(0);assert(S.sent[#S.sent][2]==0)
local alias;S.events['__cfx_export_pma-voice_setRadioVolume'](function(fn)alias=fn end)
alias(20);assert(S.exports.getRadioVolume()==20)
`,clientSetup));

test('server JS admin mute is inert when disabled or blocked by legacy engine',()=>{
 const vm=require('node:vm');
 for(const [enabled,state,name,want] of [[false,'stopped',null,0],[true,'started',null,0],[true,'started','five-voice',1]]){
  let registered=0;
  vm.runInNewContext(read('engine/server/mute.js'),{GetConvar:()=>enabled?'true':'false',GetResourceState:()=>state,GetResourceMetadata:()=>name,RegisterCommand:()=>registered++});
  assert.equal(registered,want);
 }
});

test('/fivemute command and key binding: unassigned by default, does not touch radio or phone channel',()=>run(['bootstrap.lua','client/mute.lua'],`
assert(S.key.command=='fivemute' and S.key.key=='')
LocalPlayer.state.radioChannel=911;LocalPlayer.state.callChannel=77
S.commands.fivemute();assert(LocalPlayer.state.fiveVoiceFullMuted==true)
assert(LocalPlayer.state.radioChannel==911 and LocalPlayer.state.callChannel==77)
S.commands.fivemute();assert(LocalPlayer.state.fiveVoiceFullMuted==false)
`,`
S.commands={}
function RegisterCommand(name,fn)S.commands[name]=fn end
function RegisterKeyMapping(command,label,device,key)S.key={command=command,key=key}end
function RegisterNUICallback()end
function SendNUIMessage()end
function MumbleSetVoiceTarget()end
function MumbleClearVoiceTarget()end
function ExecuteCommand()end
function DisableControlAction()end
function LocalPlayer.state:set(k,v)self[k]=v end
`));
