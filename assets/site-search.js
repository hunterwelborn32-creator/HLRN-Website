(function(){
"use strict";

function boot(){
  var nav=document.getElementById("hlrn-global-nav");
  if(!nav){setTimeout(boot,50);return}
  if(document.getElementById("hlrn-site-search"))return;

  var scripts=[].slice.call(document.scripts);
  var self=scripts.slice().reverse().find(function(s){return /(?:^|\/)site-search\.js(?:\?|$)/i.test(s.src||"")});
  var root;
  try{root=new URL("../",self.src)}catch(e){root=new URL("/",location.origin)}
  function u(path){return new URL(path||"",root).href}

  var desktop=document.createElement("button");
  desktop.className="hgn-search";
  desktop.type="button";
  desktop.setAttribute("aria-label","Search HLRN");
  desktop.innerHTML='<span aria-hidden="true">⌕</span> SEARCH';

  var mobile=document.createElement("button");
  mobile.className="hgn-mobile-search";
  mobile.type="button";
  mobile.innerHTML='<span aria-hidden="true">⌕</span> SEARCH HLRN';

  var login=nav.querySelector(".hgn-login");
  var mobileLogin=nav.querySelector(".hgn-mobile-login");
  if(login)login.parentNode.insertBefore(desktop,login);
  if(mobileLogin)mobileLogin.parentNode.insertBefore(mobile,mobileLogin);

  var overlay=document.createElement("div");
  overlay.id="hlrn-site-search";
  overlay.hidden=true;
  overlay.innerHTML=
    '<div class="hgs-backdrop" data-hgs-close></div>'+
    '<section class="hgs-dialog" role="dialog" aria-modal="true" aria-label="Search High Line Racing Network">'+
      '<header class="hgs-head">'+
        '<div class="hgs-brand"><span>HLRN</span><div><strong>SEARCH</strong><small>FIND ANYTHING ON THE NETWORK</small></div></div>'+
        '<button class="hgs-close" type="button" data-hgs-close aria-label="Close search">×</button>'+
      '</header>'+
      '<div class="hgs-input-wrap"><span class="hgs-icon" aria-hidden="true">⌕</span><input class="hgs-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search drivers, teams, races, tracks, news, Adventures…" aria-label="Search HLRN"><kbd>ESC</kbd></div>'+
      '<div class="hgs-tabs" role="tablist" aria-label="Search categories">'+
        '<button class="active" type="button" data-hgs-cat="all">ALL</button>'+
        '<button type="button" data-hgs-cat="driver">DRIVERS</button>'+
        '<button type="button" data-hgs-cat="team">TEAMS</button>'+
        '<button type="button" data-hgs-cat="race">RACES</button>'+
        '<button type="button" data-hgs-cat="adventure">ADVENTURES</button>'+
        '<button type="button" data-hgs-cat="page">PAGES</button>'+
      '</div>'+
      '<div class="hgs-status"><span class="hgs-status-dot"></span><b class="hgs-status-text">BUILDING HLRN SEARCH INDEX…</b><span class="hgs-count"></span></div>'+
      '<div class="hgs-results" role="listbox" aria-label="Search results"></div>'+
      '<footer class="hgs-foot"><span><kbd>↑</kbd><kbd>↓</kbd> MOVE</span><span><kbd>ENTER</kbd> OPEN</span><span><kbd>CTRL</kbd> + <kbd>K</kbd> SEARCH</span></footer>'+
    '</section>';
  document.body.appendChild(overlay);

  var input=overlay.querySelector(".hgs-input");
  var results=overlay.querySelector(".hgs-results");
  var status=overlay.querySelector(".hgs-status-text");
  var count=overlay.querySelector(".hgs-count");
  var tabs=[].slice.call(overlay.querySelectorAll("[data-hgs-cat]"));
  var index=[];
  var ready=false;
  var category="all";
  var selected=0;
  var visible=[];

  function esc(v){
    return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function pretty(name){
    var raw=String(name||"").trim();
    if(raw.indexOf(",")<0)return raw.replace(/\d+$/,"").trim();
    var p=raw.split(",");
    var last=(p.shift()||"").trim().replace(/\d+$/,"");
    var first=p.join(" ").trim();
    return (first+" "+last).trim();
  }
  function norm(v){
    return String(v||"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
  }
  function add(map,item){
    var key=item.type+"|"+item.url+"|"+item.title;
    if(map.has(key))return;
    item._hay=norm([item.title,item.subtitle,item.keywords,item.meta].join(" "));
    map.set(key,item);
  }
  function staticItems(){
    var pages=[
      ["Home","HLRN homepage and championship center","","home high line racing network"],
      ["Live Race Center","Live timing, race feed and race-night command","live/","live race center timing feed"],
      ["Standings","Sunday, Monday and Hosted championship standings","standings/","standings points championship hosted sunday monday"],
      ["Race Intelligence","Form, momentum, consistency and performance analysis","race-intelligence/","intelligence momentum form performance"],
      ["Results & Schedule","Upcoming races, schedules and completed race archive","results/","results schedule race archive post race report"],
      ["Race Week Preview","Automatic pre-race preview and drivers to watch","race-preview/","race week preview pre race track history drivers to watch"],
      ["Drivers","HLRN driver directory and profiles","drivers/","drivers profiles statistics directory"],
      ["Teams","HLRN team profiles and championship data","teams/","teams roster profiles championship"],
      ["News & Blogs","HLRN news, announcements and stories","news/","news blogs announcements stories"],
      ["Fantasy","HLRN fantasy racing","fantasy/","fantasy picks leaderboard"],
      ["Adventures of High Line","HLRN original illustrated racing series","adventures/","adventures high line episode series"],
      ["Meet the Admins","Meet the HLRN administration team","meet-the-admins/","admins administration team"],
      ["Rules","HLRN league rules","rules/","rules regulations penalties"],
      ["Watch HLRN","HLRN broadcasts, replays and network coverage","broadcasters/","broadcast broadcasters watch hlrn youtube rsi"],
      ["Store","HLRN store","store/","store merchandise shop"]
    ];
    var out=pages.map(function(p){return {type:"page",title:p[0],subtitle:p[1],url:u(p[2]),keywords:p[3],meta:"PAGE"}});
    for(var i=1;i<=9;i++){
      out.push({type:"adventure",title:"Adventures of High Line — Episode "+i,subtitle:"HLRN original illustrated racing series",url:u("adventures/episode-"+String(i).padStart(2,"0")+"/"),keywords:"adventures high line episode "+i+" story",meta:"ADVENTURES"});
    }
    out.push({type:"adventure",title:"Adventures of High Line — VRX Land",subtitle:"Special Adventures mini episode",url:u("adventures/special-vrx-land/"),keywords:"adventures vrx land special episode team vrx",meta:"ADVENTURES"});
    return out;
  }
  function driverUrl(league,d){
    var name=pretty(d.driver||"");
    var slug=String(name||"driver").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"driver";
    return u("drivers/"+slug+"/");
  }
  function teamUrl(league,name){
    return u("teams/")+"?"+new URLSearchParams({league:league,team:name}).toString();
  }
  function raceUrl(league,race){
    return u("results/")+"?"+new URLSearchParams({league:league,race:String(race)}).toString();
  }
  async function build(){
    var map=new Map();
    staticItems().forEach(function(x){add(map,x)});
    try{
      var res=await fetch(u("data/hlrn.json"),{cache:"no-store"});
      if(!res.ok)throw new Error("data "+res.status);
      var data=await res.json();
      ["sunday","monday"].forEach(function(leagueKey){
        var league=(data.leagues&&data.leagues[leagueKey])||{};
        var leagueName=leagueKey==="sunday"?"Sunday":"Monday";
        var byId=new Map((league.drivers||[]).map(function(d){return [String(d.driverId||""),d]}));

        (league.drivers||[]).forEach(function(d){
          var name=pretty(d.driver);
          add(map,{
            type:"driver",
            title:name||"HLRN Driver",
            subtitle:leagueName+" driver"+(d.rank?" • P"+d.rank:"")+(d.points!=null?" • "+d.points+" pts":""),
            url:driverUrl(leagueKey,d),
            keywords:[d.driver,d.driverId,"driver",leagueName,d.rank?("rank "+d.rank):"",d.wins?("wins "+d.wins):""].join(" "),
            meta:leagueName.toUpperCase()+" DRIVER"
          });
        });

        (league.teams||[]).forEach(function(t){
          var team=String(t.team||"").trim();
          if(!team)return;
          add(map,{
            type:"team",
            title:team,
            subtitle:leagueName+" team"+(t.rank?" • P"+t.rank:"")+(t.points!=null?" • "+Number(t.points).toFixed(1)+" pts":""),
            url:teamUrl(leagueKey,team),
            keywords:"team "+team+" "+leagueName+" championship roster",
            meta:leagueName.toUpperCase()+" TEAM"
          });
        });

        var groups=new Map();
        (league.results||[]).forEach(function(row){
          var k=String(row.raceId||row.raceNumber||"");
          if(!groups.has(k))groups.set(k,[]);
          groups.get(k).push(row);
        });
        groups.forEach(function(rows){
          rows.sort(function(a,b){return Number(a.finish||999)-Number(b.finish||999)});
          var r=rows[0];
          if(!r)return;
          var winner=rows.find(function(x){return Number(x.finish)===1});
          var winnerName=winner?pretty((byId.get(String(winner.driverId))||{}).driver||""):"";
          var track=String(r.track||"Race");
          add(map,{
            type:"race",
            title:track+" — "+leagueName+" Race "+r.raceNumber,
            subtitle:(winnerName?"Winner: "+winnerName+" • ":"")+"Race "+r.raceNumber,
            url:raceUrl(leagueKey,r.raceNumber),
            keywords:[track,leagueName,"race",r.raceNumber,"result","results","winner",winnerName,"post race report"].join(" "),
            meta:leagueName.toUpperCase()+" RACE"
          });
        });
      });
      index=Array.from(map.values());
      ready=true;
      status.textContent="SEARCH INDEX ONLINE";
      overlay.querySelector(".hgs-status-dot").classList.add("ready");
    }catch(err){
      console.warn("HLRN site search:",err);
      index=Array.from(map.values());
      ready=true;
      status.textContent="SITE SEARCH ONLINE • LIVE DATA LIMITED";
    }
    render();
  }
  function score(item,tokens,phrase){
    if(!tokens.length)return 0;
    var title=norm(item.title),hay=item._hay||"";
    if(!tokens.every(function(t){return hay.indexOf(t)>=0}))return -1;
    var s=0;
    if(title===phrase)s+=200;
    if(title.indexOf(phrase)===0)s+=110;
    else if(title.indexOf(phrase)>=0)s+=75;
    tokens.forEach(function(t){
      if(title.split(" ").indexOf(t)>=0)s+=24;
      else if(title.indexOf(t)>=0)s+=14;
      else s+=5;
    });
    return s;
  }
  function icon(type){
    return {driver:"66",team:"T",race:"🏁",adventure:"A",page:"HL"}[type]||"HL";
  }
  function render(){
    var q=input.value.trim();
    var phrase=norm(q);
    var tokens=phrase.split(" ").filter(Boolean);
    var rows;
    if(tokens.length){
      rows=index.map(function(item){return {item:item,score:score(item,tokens,phrase)}})
        .filter(function(x){return x.score>=0&&(category==="all"||x.item.type===category)})
        .sort(function(a,b){return b.score-a.score||a.item.title.localeCompare(b.item.title)})
        .slice(0,40).map(function(x){return x.item});
    }else{
      rows=index.filter(function(x){return category==="all"||x.type===category}).slice(0,12);
    }
    visible=rows;
    selected=Math.min(selected,Math.max(0,rows.length-1));
    count.textContent=rows.length+(q?(" RESULT"+(rows.length===1?"":"S")):"");

    if(!ready){
      results.innerHTML='<div class="hgs-empty"><b>BUILDING SEARCH INDEX</b><span>Connecting to current HLRN data…</span></div>';
      return;
    }
    if(!rows.length){
      results.innerHTML='<div class="hgs-empty"><b>NO RESULTS FOR “'+esc(q)+'”</b><span>Try a driver, team, track, race number, page, or Adventures episode.</span></div>';
      return;
    }
    results.innerHTML=rows.map(function(item,i){
      return '<a class="hgs-result '+(i===selected?"selected":"")+'" href="'+esc(item.url)+'" data-hgs-index="'+i+'">'+
        '<span class="hgs-result-icon '+esc(item.type)+'">'+esc(icon(item.type))+'</span>'+
        '<span class="hgs-result-copy"><small>'+esc(item.meta||item.type.toUpperCase())+'</small><strong>'+esc(item.title)+'</strong><span>'+esc(item.subtitle||"")+'</span></span>'+
        '<span class="hgs-result-open">OPEN <b>→</b></span>'+
      '</a>';
    }).join("");
    var chosen=results.querySelector(".hgs-result.selected");
    if(chosen)chosen.scrollIntoView({block:"nearest"});
  }
  function open(){
    overlay.hidden=false;
    document.documentElement.classList.add("hlrn-search-open");
    setTimeout(function(){input.focus();input.select()},0);
    render();
  }
  function close(){
    overlay.hidden=true;
    document.documentElement.classList.remove("hlrn-search-open");
  }

  [desktop,mobile].forEach(function(btn){btn.addEventListener("click",open)});
  [].slice.call(overlay.querySelectorAll("[data-hgs-close]")).forEach(function(el){el.addEventListener("click",close)});
  input.addEventListener("input",function(){selected=0;render()});
  tabs.forEach(function(tab){
    tab.addEventListener("click",function(){
      category=tab.getAttribute("data-hgs-cat")||"all";
      tabs.forEach(function(t){t.classList.toggle("active",t===tab)});
      selected=0;
      render();
      input.focus();
    });
  });
  results.addEventListener("mousemove",function(e){
    var row=e.target.closest("[data-hgs-index]");
    if(!row)return;
    selected=Number(row.getAttribute("data-hgs-index"))||0;
    [].slice.call(results.querySelectorAll(".hgs-result")).forEach(function(el,i){el.classList.toggle("selected",i===selected)});
  });
  input.addEventListener("keydown",function(e){
    if(e.key==="ArrowDown"&&visible.length){e.preventDefault();selected=(selected+1)%visible.length;render()}
    else if(e.key==="ArrowUp"&&visible.length){e.preventDefault();selected=(selected-1+visible.length)%visible.length;render()}
    else if(e.key==="Enter"&&visible[selected]){e.preventDefault();location.href=visible[selected].url}
  });
  document.addEventListener("keydown",function(e){
    var tag=(e.target&&e.target.tagName||"").toLowerCase();
    var typing=tag==="input"||tag==="textarea"||(e.target&&e.target.isContentEditable);
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="k"){e.preventDefault();overlay.hidden?open():close();return}
    if(e.key==="/"&&!typing&&overlay.hidden){e.preventDefault();open();return}
    if(e.key==="Escape"&&!overlay.hidden){e.preventDefault();close()}
  });

  build();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();