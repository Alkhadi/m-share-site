/* voice coach disabled by remove-voice-coach.mjs */
(function(){
  try {
    window.__MShareDisableVoiceCoach = true;
    const MS = (window.__MSHARE__ = window.__MSHARE__ || {});
    MS.VoiceCoach = MS.VoiceCoach || { init(){}, show(){}, hide(){}, start(){}, pause(){}, resume(){}, stop(){} };
    console.info("Voice coach stub active.");
  } catch(e){}
})();