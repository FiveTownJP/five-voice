const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const source=fs.readFileSync(path.join(__dirname,'../client/lipsync.lua'),'utf8');
function run(body, setup=''){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const mock=`
FiveVoiceEnabled=true
S={events={},threads={},calls={},connected=true,enabled=1,players={0,1},peds={[0]=10,[1]=11},ids={[0]=100,[1]=101},talk={},dead={},model={}}
function GetConvarInt()return S.enabled end
function PlayerId()return 0 end
function GetActivePlayers()local p={}for i,v in ipairs(S.players)do p[i]=v end return p end
function NetworkIsPlayerActive(p)return S.peds[p]~=nil end
function GetPlayerPed(p)return S.peds[p] or 0 end
function GetPlayerServerId(p)return S.ids[p] or -1 end
function DoesEntityExist(p)return p~=0 end
function GetEntityModel(p)return S.model[p] or 123 end
function HasAnimDictLoaded()return not S.loading end
function RequestAnimDict()S.requests=(S.requests or 0)+1 end
function IsPedDeadOrDying(p)return S.dead[p] or false end
function MumbleIsPlayerTalking(p)return S.talk[p] or 0 end
function MumbleIsConnected()return S.connected end
function PlayFacialAnim(p,a,d)S.calls[#S.calls+1]={p,a,d}end
function CreateThread(fn)S.threads[#S.threads+1]=coroutine.create(fn)end
function Wait(ms)assert(ms==100);coroutine.yield()end
function AddEventHandler(e,fn)S.events[e]=fn end
function GetCurrentResourceName()return 'five-voice'end
function tick()local ok,e=coroutine.resume(S.threads[1]);assert(ok,e)end
`;
 try { for(const c of [mock+setup,source,body]){
  if(lauxlib.luaL_dostring(L,to_luastring(c))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));
 }}finally{lua.lua_close(L);}
}
test('lip sync: core disabled registers nothing',()=>run('assert(#S.threads==0 and next(S.events)==nil)','FiveVoiceEnabled=false'));
test('lip sync: starts on actual local/remote voice, not numerical zero or silence',()=>run(`
tick();assert(#S.calls==0)
S.talk[0]=1;S.talk[1]=true;tick();assert(#S.calls==2)
assert(S.calls[1][1]==10 and S.calls[2][1]==11 and S.calls[1][2]=='mic_chatter')
tick();assert(#S.calls==2) -- 発話中に毎回アニメーションをリセットしない
S.talk[0]=0;S.talk[1]=false;tick();assert(#S.calls==4 and S.calls[3][2]=='mood_normal_1')
tick();assert(#S.calls==4)
`));
test('lip sync: local player works even when absent from streamed list',()=>run(`S.players={};S.talk[0]=true;tick();assert(#S.calls==1 and S.calls[1][1]==10)`));
test('lip sync: full muted local mic does not animate while remote speakers still do',()=>run(`FiveVoiceFullMuted=true;S.talk[0]=1;S.talk[1]=1;tick();assert(#S.calls==1 and S.calls[1][1]==11)`));
test('lip sync: waits for animation dictionaries without blocking voice',()=>run(`S.loading=true;S.talk[0]=1;tick();assert(S.requests==2 and #S.calls==0);S.loading=false;tick();assert(#S.calls==1)`));
test('lip sync: death, disconnect and disable close owned animations',()=>run(`
S.talk[0]=1;tick();S.dead[10]=true;tick();assert(#S.calls==2)
S.dead[10]=false;tick();S.connected=false;tick();assert(#S.calls==4)
S.connected=0;tick();assert(#S.calls==4)
S.connected=1;tick();S.enabled=0;tick();assert(#S.calls==6)
`));
test('lip sync: ped change and recycled player index do not reset another character',()=>run(`
S.talk[0]=true;tick();S.peds[0]=20;tick();assert(#S.calls==2 and S.calls[2][1]==20)
S.ids[0]=200;tick();assert(#S.calls==3 and S.calls[3][2]=='mic_chatter')
S.model[20]=456;tick();assert(#S.calls==4 and S.calls[4][2]=='mic_chatter')
`));
test('lip sync: stream-out and own resource end clean up only tracked faces',()=>run(`
S.talk[0]=1;S.talk[1]=1;tick();S.players={0};tick();assert(#S.calls==3 and S.calls[3][1]==11)
S.events.onResourceStop('other');assert(#S.calls==3)
S.events.onResourceStop('five-voice');assert(#S.calls==4 and S.calls[4][1]==10)
S.events.onResourceStop('five-voice');assert(#S.calls==4)
`));
