(function(){
  const read = id => {
    const el=document.getElementById(id);
    return el ? String(el.textContent||'').trim() : '';
  };
  const write = (id,val,fallback='--') => {
    const el=document.getElementById(id);
    if(el) el.textContent=(val && !/^loading/i.test(val)) ? val : fallback;
  };
  function syncPitwall(){
    write('v3HeroTopDriver',read('hqTopDriver'),'CONNECTING');
    write('v3HeroLatestWinner',read('lastRaceWinner'),'--');
    write('v3HeroRaceDay',read('hqRaceDay'),'RACE WEEK');
    write('v3HeroSunday',read('hqSundayDate'),'--');
    write('v3HeroMonday',read('hqMondayDate'),'--');
  }
  document.addEventListener('DOMContentLoaded',function(){
    syncPitwall();
    setTimeout(syncPitwall,900);
    setTimeout(syncPitwall,2500);
    setTimeout(syncPitwall,5000);
  });
  setInterval(syncPitwall,8000);
})();

(function(){
  function txt(id){var e=document.getElementById(id);return e?String(e.textContent||'').trim():'';}
  function clean(v,f){if(!v||/^loading/i.test(v)||/^connecting/i.test(v))return f||'--';return v;}
  function put(id,v,f){var e=document.getElementById(id);if(e)e.textContent=clean(v,f);}
  function sync(){
    var winner=clean(txt('lastRaceWinner'),'HLRN');
    var track=clean(txt('lastRaceTrack'),'Latest HLRN Race');
    var date=clean(txt('lastRaceDate'),'');
    var drivers=clean(txt('raceStatDrivers'),'--');
    var laps=clean(txt('raceStatLaps'),'--');
    var cautions=clean(txt('raceStatCautions'),'--');
    var top=clean(txt('hqTopDriver'),'CONNECTING');
    put('rdLatestWinner',winner,'CONNECTING');
    put('rdTopDriver',top,'CONNECTING');
    put('rdSunday',txt('hqSundayDate'),'--');
    put('rdMonday',txt('hqMondayDate'),'--');
    put('rdLastTrack',track,'LATEST HLRN RESULT');
    put('rdLastDate',date,'--');
    put('rdLastWinner',winner,'--');
    put('rdLastDrivers',drivers,'--');
    put('rdLastLaps',laps,'--');
    put('rdLastCautions',cautions,'--');
    put('rdStoryRanking',txt('hqHeadlineRanking'),'Current driver rankings');
    put('rdStoryWins',txt('hqHeadlineWins'),'HLRN wins leaderboard');
    put('rdStoryNetwork',txt('hqHeadlineNetwork'),'HLRN network update');
    var h=document.getElementById('rdLeadHeadline');
    var s=document.getElementById('rdLeadSub');
    if(h){h.textContent=(winner&&winner!=='HLRN')?winner+' WINS AT '+track:'HIGH LINE RACING NETWORK';}
    if(s){
      var bits=[];
      if(date)bits.push(date);
      if(drivers&&drivers!=='--')bits.push(drivers+' drivers');
      if(laps&&laps!=='--')bits.push(laps+' laps');
      s.textContent=bits.length?bits.join(' • '):'Sunday and Monday night competition. Hosted racing. Live broadcasts.';
    }
  }
  document.addEventListener('DOMContentLoaded',function(){sync();[900,2200,5000].forEach(function(t){setTimeout(sync,t)});});
  setInterval(sync,7000);
})();

(function(){
"use strict";

const PHOTO_BASE="https://hunterwelborn32-creator.github.io/HLRN-App/driver-photos/cutout/";
const FULL_PHOTO_BASE="https://hunterwelborn32-creator.github.io/HLRN-App/driver-photos/full/";
const PHOTO_MAP={"aarontruebig":"aaron-truebig.webp","alexleebaw":"alex-leebaw.webp","benjaminrichards":"benjamin-richards.webp","billdaniels":"bill-daniels.webp","brandonbeyke":"brandon-beyke.webp","brandonshowers":"brandon-showers.webp","brianhayes":"brian-hayes.webp","brianhebbard":"brian-hebbard.webp","brianhennings":"brian-hennings.webp","brockpiper":"brock-piper.webp","brycehinton":"bryce-hinton.webp","carsonfreeman":"carson-freeman.webp","charlesfletcher":"charles-fletcher.webp","chrisjames":"chris-james.webp","coricooke":"cori-cooke.webp","craigrowe":"craig-rowe.webp","darrelceballos":"darrel-ceballos.webp","daviddurand":"david-durand.webp","derekjacobs":"derek-jacobs.webp","donnybeach":"donny-beach.webp","dylanjones":"dylan-jones.webp","erichayden":"eric-hayden.webp","ethaneckert":"ethan-eckert.webp","ethanmoreno":"ethan-moreno.webp","evanfuqua":"evan-fuqua.webp","evankarlbon":"evan-karlbon.webp","evanparry":"evan-parry.webp","gerrybergeron":"gerry-bergeron.webp","grantwessley":"grant-wessley.webp","hunterwelborn":"hunter-welborn.webp","jaredphilpott":"jared-philpott.webp","jasonbranch":"jason-branch.webp","javonethompson":"javone-thompson.webp","jeremyjeffries":"jeremy-jeffries.webp","jerryfassett":"jerry-fassett.webp","jimsegredo":"jim-segredo.webp","joekonen":"joe-konen.webp","johnmiles":"john-miles.webp","joshmckinney":"josh-mckinney.webp","joshuaspragg":"joshua-spragg.webp","juanescamilla":"juan-escamilla.webp","justincrowe":"justin-crowe.webp","keatoncox":"keaton-cox.webp","kennyreel":"kenny-reel.webp","kenwoodramsey":"kenwood-ramsey.webp","kodyneagles":"kody-neagles.webp","kylekammeron":"kyle-kammeron.webp","larkinboyer":"larkin-boyer.webp","matthewbrown":"matthew-brown.webp","matthewgraham":"matthew-graham.webp","nicholasbaumann":"nicholas-baumann.webp","nicholasmoody":"nicholas-moody.webp","randyschweitzer":"randy-schweitzer.webp","randyshowers":"randy-showers.webp","rickymiles":"ricky-miles.webp","rosscampoli":"ross-campoli.webp","ryanwilson":"ryan-wilson.webp","scottwise":"scott-wise.webp","sebastianmichaels":"sebastian-michaels.webp","shanehatfield":"shane-hatfield.webp","shawnstamper":"shawn-stamper.webp","timothytyler":"timothy-tyler.webp","tjlunn":"tj-lunn.webp","tommyrogers":"tommy-rogers.webp","trevoraswarnauth":"trevor-aswarnauth.webp","trevorhaley":"trevor-haley.webp","vincenteguerrero":"vincente-guerrero.webp","zackharry":"zack-harry.webp"};
const PHOTO_ALIASES={"sebastianmicheals":"sebastianmichaels","ericpedleyhayden":"erichayden","randyschweitzerrsi":"randyschweitzer","dyalnjones":"dylanjones","nicholasbaumann2":"nicholasbaumann","dylancjones":"dylanjones","ethanfonsecamoreno":"ethanmoreno","joshuamckinney":"joshmckinney","joshuamckinney2":"joshmckinney","jeremysjeffries":"jeremyjeffries","vicenteguerrero2":"vincenteguerrero","vincenteeguerrero":"vincenteguerrero","brianhebbard2":"brianhebbard","brianhayes4":"brianhayes","ryanwilson21":"ryanwilson","timothytyler3":"timothytyler","matthewbrown49":"matthewbrown","matthewgraham20":"matthewgraham","justincrowetransparent":"justincrowe"};
const DISPLAY_VARIANTS={"Dylan C Jones":"dylanjones","Dyaln Jones":"dylanjones","Ethan Fonseca Moreno":"ethanmoreno","Joshua McKinney":"joshmckinney","Jeremy S Jeffries":"jeremyjeffries","Eric Pedley Hayden":"erichayden","Randy Schweitzer RSI":"randyschweitzer","Sebastian Micheals":"sebastianmichaels","Vicente Guerrero":"vincenteguerrero","Vincente Guerrero":"vincenteguerrero","Brian Hebbard2":"brianhebbard","Brian Hayes4":"brianhayes","Ryan Wilson21":"ryanwilson","Timothy Tyler3":"timothytyler","Matthew Brown49":"matthewbrown","Matthew Graham20":"matthewgraham","Nicholas Baumann2":"nicholasbaumann","Aaron Truebig":"aarontruebig","Alex Leebaw":"alexleebaw","Benjamin Richards":"benjaminrichards","Bill Daniels":"billdaniels","Brandon Beyke":"brandonbeyke","Brandon Showers":"brandonshowers","Brian Hayes":"brianhayes","Brian Hebbard":"brianhebbard","Brian Hennings":"brianhennings","Brock Piper":"brockpiper","Bryce Hinton":"brycehinton","Carson Freeman":"carsonfreeman","Charles Fletcher":"charlesfletcher","Chris James":"chrisjames","Cori Cooke":"coricooke","Craig Rowe":"craigrowe","Darrel Ceballos":"darrelceballos","David Durand":"daviddurand","Derek Jacobs":"derekjacobs","Donny Beach":"donnybeach","Dylan Jones":"dylanjones","Eric Hayden":"erichayden","Ethan Eckert":"ethaneckert","Ethan Moreno":"ethanmoreno","Evan Fuqua":"evanfuqua","Evan Karlbon":"evankarlbon","Evan Parry":"evanparry","Gerry Bergeron":"gerrybergeron","Grant Wessley":"grantwessley","Hunter Welborn":"hunterwelborn","Jared Philpott":"jaredphilpott","Jason Branch":"jasonbranch","Javone Thompson":"javonethompson","Jeremy Jeffries":"jeremyjeffries","Jerry Fassett":"jerryfassett","Jim Segredo":"jimsegredo","Joe Konen":"joekonen","John Miles":"johnmiles","Josh Mckinney":"joshmckinney","Joshua Spragg":"joshuaspragg","Juan Escamilla":"juanescamilla","Justin Crowe":"justincrowe","Keaton Cox":"keatoncox","Kenny Reel":"kennyreel","Kenwood Ramsey":"kenwoodramsey","Kody Neagles":"kodyneagles","Kyle Kammeron":"kylekammeron","Larkin Boyer":"larkinboyer","Matthew Brown":"matthewbrown","Matthew Graham":"matthewgraham","Nicholas Baumann":"nicholasbaumann","Nicholas Moody":"nicholasmoody","Randy Schweitzer":"randyschweitzer","Randy Showers":"randyshowers","Ricky Miles":"rickymiles","Ross Campoli":"rosscampoli","Ryan Wilson":"ryanwilson","Scott Wise":"scottwise","Sebastian Michaels":"sebastianmichaels","Shane Hatfield":"shanehatfield","Shawn Stamper":"shawnstamper","Timothy Tyler":"timothytyler","Tj Lunn":"tjlunn","Tommy Rogers":"tommyrogers","Trevor Aswarnauth":"trevoraswarnauth","Trevor Haley":"trevorhaley","Zack Harry":"zackharry"};

function escHTML(value){
    return String(value == null ? "" : value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function photoKey(name){
    let s=String(name||"").trim();
    if(!s) return "";

    /* Support LAST, FIRST and iRacing numeric suffixes. */
    if(s.includes(",")){
        const parts=s.split(",");
        const last=(parts.shift()||"").trim().replace(/\d+$/,"");
        const first=parts.join(" ").trim();
        s=(first+" "+last).trim();
    } else {
        s=s.replace(/\d+$/,"").trim();
    }

    let k=s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"");
    if(PHOTO_ALIASES[k]) k=PHOTO_ALIASES[k];

    if(!PHOTO_MAP[k]){
        const stripped=k.replace(/\d+/g,"");
        if(PHOTO_ALIASES[stripped]) k=PHOTO_ALIASES[stripped];
        else if(PHOTO_MAP[stripped]) k=stripped;
    }
    return k;
}

function photoURL(name){
    const file=PHOTO_MAP[photoKey(name)];
    return file ? PHOTO_BASE+file : "";
}

function isPlaceholder(text){
    const s=String(text||"").trim();
    return !s || /^(?:--|—|loading\.?\.\.?|connecting|unknown(?: driver)?|no qualifier|hlrn)$/i.test(s);
}

function currentPlainText(el){
    const t=el.querySelector(":scope > .hlrn-photo-name-wrap > .hlrn-photo-name-text");
    if(t) return String(t.textContent||"").trim();

    const story=el.querySelector(":scope > .hlrn-photo-story-wrap > .hlrn-photo-story-text");
    if(story) return String(story.textContent||"").trim();

    return String(el.textContent||"").trim();
}

function decorateNameElement(el){
    if(!el || el.dataset.hlrnPhotoBusy==="1") return;

    const name=currentPlainText(el);
    if(isPlaceholder(name)) return;

    const file=PHOTO_MAP[photoKey(name)];
    if(!file) return;

    const useFullPhoto=false;
    const url=PHOTO_BASE+file;
    const fallbackUrl=PHOTO_BASE+file;

    const existing=el.querySelector(":scope > .hlrn-photo-name-wrap");
    if(existing && el.dataset.hlrnPhotoName===name) return;

    el.dataset.hlrnPhotoBusy="1";
    el.dataset.hlrnPhotoName=name;
    el.innerHTML=
        '<span class="hlrn-photo-name-wrap">'+
            '<img class="hlrn-photo-inline'+(useFullPhoto?' hlrn-photo-original':'')+'" src="'+escHTML(url)+'" alt="" onerror="if(!this.dataset.fallback){this.dataset.fallback=\'1\';this.src=\''+escHTML(fallbackUrl)+'\';}else{this.style.display=\'none\';}" loading="lazy" decoding="async">'+
            '<span class="hlrn-photo-name-text">'+escHTML(name)+'</span>'+
        '</span>';
    el.dataset.hlrnPhotoBusy="0";
}

function findPhotoInSentence(text){
    const source=String(text||"").trim();
    if(!source) return null;

    /* Prefer the longest name to avoid partial matches. */
    const names=Object.keys(DISPLAY_VARIANTS).sort((a,b)=>b.length-a.length);
    const lower=source.toLowerCase();

    for(const display of names){
        if(lower.includes(display.toLowerCase())){
            const key=DISPLAY_VARIANTS[display];
            const file=PHOTO_MAP[key];
            if(file) return {display:display,url:PHOTO_BASE+file};
        }
    }
    return null;
}

function decorateStoryElement(el){
    if(!el || el.dataset.hlrnPhotoBusy==="1") return;
    if(el.id==="rdLeadHeadline") return;

    const text=currentPlainText(el);
    if(isPlaceholder(text)) return;

    const found=findPhotoInSentence(text);
    if(!found) return;

    const existing=el.querySelector(":scope > .hlrn-photo-story-wrap");
    if(existing && el.dataset.hlrnPhotoStory===text) return;

    el.dataset.hlrnPhotoBusy="1";
    el.dataset.hlrnPhotoStory=text;
    el.innerHTML=
        '<span class="hlrn-photo-story-wrap">'+
            '<img class="hlrn-photo-inline" src="'+escHTML(found.url)+'" alt="" onerror="this.style.display=\'none\'" loading="lazy" decoding="async">'+
            '<span class="hlrn-photo-story-text">'+escHTML(text)+'</span>'+
        '</span>';
    el.dataset.hlrnPhotoBusy="0";
}

const NAME_SELECTORS=[
    "#lastRaceWinner",
    "#spotlightDriver1",
    "#spotlightDriver2",
    "#spotlightDriver3",
    "#rdLatestWinner",
    "#rdTopDriver",
    "#rdLastWinner",
    "#v3HeroTopDriver",
    "#v3HeroLatestWinner",
    "#hqTopDriver",
    "#hqIntelTopDriver",
    "#hqIntelWinsDriver",
    "#hqIntelLatestWinner",
    "#hqIntelIncidentDriver",
    "#hlrnDriverAccountName",
    "#hlrnDriverMenuName",
    ".incident-driver-name",
    ".incident-average-driver",
    ".driver-profile-name"
];

const STORY_SELECTORS=[
    "#hqHeadlineRanking",
    "#hqHeadlineWins",
    "#hqHeadlineFeature"
];

function scanKnownNameTargets(root){
    const scope=(root && root.querySelectorAll) ? root : document;

    NAME_SELECTORS.forEach(selector=>{
        if(scope.matches && scope.matches(selector)) decorateNameElement(scope);
        scope.querySelectorAll(selector).forEach(decorateNameElement);
    });

    STORY_SELECTORS.forEach(selector=>{
        if(scope.matches && scope.matches(selector)) decorateStoryElement(scope);
        scope.querySelectorAll(selector).forEach(decorateStoryElement);
    });
}

/*
 * Catch any other standalone driver name that appears later on this page.
 * This lets new cards/sections inherit photos without needing another edit.
 */
function scanGenericStandaloneNames(root){
    const scope=(root && root.querySelectorAll) ? root : document;
    const nodes=[];

    if(scope.matches && scope.matches("strong,b,button,h1,h2,h3,h4,span,div,td")) nodes.push(scope);
    scope.querySelectorAll("strong,b,button,h1,h2,h3,h4,span,div,td").forEach(el=>nodes.push(el));

    nodes.forEach(el=>{
        if(el.id==="rdLeadHeadline") return;
        if(el.closest(".hlrn-photo-name-wrap,.hlrn-photo-story-wrap")) return;
        if(el.children.length) return;

        const text=String(el.textContent||"").trim();
        if(isPlaceholder(text)) return;
        if(photoURL(text)) decorateNameElement(el);
    });
}

let scanQueued=false;
function scan(root){
    scanKnownNameTargets(root||document);
    scanGenericStandaloneNames(root||document);
}

function queueScan(){
    if(scanQueued) return;
    scanQueued=true;
    requestAnimationFrame(function(){
        scanQueued=false;
        scan(document);
    });
}

function start(){
    scan(document);

    const observer=new MutationObserver(function(mutations){
        let needs=false;
        for(const m of mutations){
            const target=m.target && m.target.nodeType===3 ? m.target.parentElement : m.target;
            if(target && target.closest && target.closest(".hlrn-photo-name-wrap,.hlrn-photo-story-wrap")){
                continue;
            }
            needs=true;
            break;
        }
        if(needs) queueScan();
    });

    observer.observe(document.body,{
        childList:true,
        subtree:true,
        characterData:true
    });

    /* Existing homepage scripts refresh at different intervals. */
    setTimeout(queueScan,500);
    setTimeout(queueScan,1200);
    setTimeout(queueScan,3000);
    setInterval(queueScan,7000);
}

if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",start,{once:true});
} else {
    start();
}

})();

(function(){
  function text(id){var el=document.getElementById(id);if(!el)return "";var t=el.querySelector&&el.querySelector(".hlrn-photo-name-text");return String(t?t.textContent:el.textContent||"").trim();}
  function put(id,value,fallback){var el=document.getElementById(id);if(!el)return;var v=String(value||"").trim();el.textContent=(!v||/^(?:--|connecting|loading)$/i.test(v))?(fallback||"--"):v;}
  function sync(){
    var sun=text("rdSunday"), mon=text("rdMonday"), top=text("rdTopDriver");
    put("v7SundayDate",sun,"SEE SCHEDULE");put("v7MondayDate",mon,"SEE SCHEDULE");
    put("v7SundayMirror",sun,"--");put("v7MondayMirror",mon,"--");put("v7TopDriverMirror",top,"CONNECTING");
  }
  document.addEventListener("DOMContentLoaded",function(){sync();setTimeout(sync,900);setTimeout(sync,2400);setTimeout(sync,5000)});
  setInterval(sync,7000);
})();

(function(){
  function text(id){
    var el=document.getElementById(id);
    if(!el) return "";
    var t=el.querySelector&&el.querySelector(".hlrn-photo-name-text");
    return String(t?t.textContent:el.textContent||"").trim();
  }
  function put(id,value){
    var el=document.getElementById(id);
    if(el && value && !/^(?:--|connecting)$/i.test(value)) el.textContent=value;
  }
  function sync(){
    put("v6TopDriverMirror",text("rdTopDriver"));
    put("v6LatestWinnerMirror",text("rdLatestWinner"));
  }
  document.addEventListener("DOMContentLoaded",function(){
    sync();
    setTimeout(sync,1000);
    setTimeout(sync,2600);
  });
  setInterval(sync,7000);
})();
