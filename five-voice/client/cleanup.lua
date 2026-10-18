if not FiveVoiceEnabled then return end
AddEventHandler('onResourceStop', function(resource)
 if resource == GetCurrentResourceName() then
  SendNUIMessage({fiveVoiceClosed=true})
 end
end)
