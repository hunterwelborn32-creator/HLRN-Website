// NASCAR venue/configuration registry.
// A listing is NOT a claim that surveyed or licensed geometry exists.
// Accurate paths must be individually sourced, reviewed and calibrated.
const TRACKS=[
["atlanta","Atlanta Motor Speedway","oval","atlanta|echo park speedway"],
["bristol","Bristol Motor Speedway","short","bristol"],
["bowman-gray","Bowman Gray Stadium","short","bowman gray"],
["charlotte-roval","Charlotte Motor Speedway Roval","road","charlotte.*roval|charlotte.*road course"],
["charlotte-oval","Charlotte Motor Speedway","oval","charlotte"],
["chicagoland","Chicagoland Speedway","oval","chicagoland"],
["chicago-street","Chicago Street Course","road","chicago.*street|grant park"],
["circuit-americas","Circuit of the Americas","road","circuit of the americas|\\bcota\\b"],
["darlington","Darlington Raceway","oval","darlington"],
["daytona-road","Daytona Road Course","road","daytona.*(road|sports car)"],
["daytona-oval","Daytona International Speedway","daytona","daytona"],
["dover","Dover Motor Speedway","oval","dover"],
["gateway","World Wide Technology Raceway","oval","world wide technology|gateway"],
["homestead","Homestead-Miami Speedway","oval","homestead"],
["indianapolis-road","Indianapolis Road Course","road","indianapolis.*(road|grand prix)"],
["indianapolis-oval","Indianapolis Motor Speedway","oval","indianapolis|brickyard"],
["iowa","Iowa Speedway","short","iowa"],
["kansas","Kansas Speedway","oval","kansas"],
["kentucky","Kentucky Speedway","oval","kentucky"],
["las-vegas","Las Vegas Motor Speedway","oval","las vegas"],
["martinsville","Martinsville Speedway","short","martinsville"],
["michigan","Michigan International Speedway","oval","michigan"],
["nashville","Nashville Superspeedway","oval","nashville sup"],
["new-hampshire","New Hampshire Motor Speedway","oval","new hampshire|loudon"],
["north-wilkesboro","North Wilkesboro Speedway","short","north wilkesboro"],
["phoenix","Phoenix Raceway","oval","phoenix"],
["pocono","Pocono Raceway","trioval","pocono"],
["richmond","Richmond Raceway","short","richmond"],
["road-america","Road America","road","road america"],
["sonoma","Sonoma Raceway","road","sonoma"],
["talladega","Talladega Superspeedway","trioval","talladega"],
["texas","Texas Motor Speedway","oval","texas motor"],
["watkins-glen","Watkins Glen International","road","watkins glen"],
["autodromo-hermanos-rodriguez","Autódromo Hermanos Rodríguez","road","hermanos rodriguez|mexico city"],
["lime-rock","Lime Rock Park","road","lime rock"],
["mid-ohio","Mid-Ohio Sports Car Course","road","mid.ohio"],
["portland","Portland International Raceway","road","portland international"],
["mosport","Canadian Tire Motorsport Park","road","canadian tire motorsport|mosport"],
["irwindale","Irwindale Speedway","short","irwindale"],
["milwaukee","Milwaukee Mile","oval","milwaukee"],
["rockingham","Rockingham Speedway","oval","rockingham"],
["south-boston","South Boston Speedway","short","south boston"],
["stafford","Stafford Motor Speedway","short","stafford"],
["thompson","Thompson Speedway","short","thompson"],
["virginia-international","Virginia International Raceway","road","virginia international|\\bvir\\b"],
["laguna-seca","WeatherTech Raceway Laguna Seca","road","laguna seca"],
["sebring","Sebring International Raceway","road","sebring"]
];
export const trackCatalog=Object.freeze(TRACKS.map(([id,name,profile,pattern])=>Object.freeze({id,name,profile,pattern})));
export function resolveTrack(value){
 const name=String(value||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
 if(!name)return null;
 const special=trackCatalog.filter(t=>/(road|roval|street)/.test(t.id));
 for(const entry of [...special,...trackCatalog]){
  if(new RegExp(entry.pattern,"i").test(name))return entry;
 }
 return null;
}
// Accurate Daytona path is a reference-based broadcast drawing.
// Other venues intentionally use labeled generic silhouettes until actual
// venue geometry is independently sourced and properly calibrated.
export const geometryStatus=id=>id==="daytona-oval"?"reference-based schematic":"generic fallback — venue outline pending";
