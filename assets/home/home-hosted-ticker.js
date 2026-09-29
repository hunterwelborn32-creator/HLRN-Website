(function(){

  function safeText(value){
    return String(value == null ? "" : value)
      .replace(/\s+/g," ")
      .trim();
  }

  function numberValue(value){
    const n = Number(
      safeText(value)
        .replace(/,/g,"")
        .replace(/[^\d.-]/g,"")
    );
    return Number.isFinite(n) ? n : null;
  }

  function parseRaceDate(value){
    const raw = safeText(value);
    if(!raw) return null;

    const parsed = Date.parse(raw);
    if(Number.isFinite(parsed)) return parsed;

    return null;
  }

  async function loadLatestHostedFinishingOrder(){
    const ticker = document.getElementById("hlrnLiveTickerTrack");
    if(!ticker) return;

    try{
      /*
       * DRIVER DATA columns:
       * A = Race ID
       * B = Race Date
       * C = Track
       * D = Driver
       * E = Finish Position
       * F = Car #
       * G = Start Position
       * H = Laps
       * I = Laps Led
       * J = Incidents
       * K = Best Lap
       * L = Average Lap
       * M = iRating
       */
      const rows = await getHLRNRange("DRIVER DATA","A2:M");

      const parsedRows = rows.map(function(row,index){
        return {
          raceId: safeText(row[0]),
          date: safeText(row[1]),
          track: safeText(row[2]),
          driver: safeText(row[3]),
          finish: numberValue(row[4]),
          car: safeText(row[5]),
          start: numberValue(row[6]),
          laps: numberValue(row[7]),
          led: numberValue(row[8]),
          incidents: numberValue(row[9]),
          index: index
        };
      }).filter(function(row){
        return row.raceId && row.driver && row.finish !== null;
      });

      if(!parsedRows.length){
        throw new Error("No hosted result rows found.");
      }

      /*
       * Pick the newest race:
       * 1) newest parsed race date
       * 2) if multiple races share that date, use the race group
       *    appearing latest in the DRIVER DATA sheet.
       */
      let newestTimestamp = -Infinity;

      parsedRows.forEach(function(row){
        const stamp = parseRaceDate(row.date);
        if(stamp !== null && stamp > newestTimestamp){
          newestTimestamp = stamp;
        }
      });

      let candidates = parsedRows;

      if(Number.isFinite(newestTimestamp)){
        candidates = parsedRows.filter(function(row){
          return parseRaceDate(row.date) === newestTimestamp;
        });
      }

      const raceGroups = {};
      candidates.forEach(function(row){
        if(!raceGroups[row.raceId]){
          raceGroups[row.raceId] = {
            raceId: row.raceId,
            rows: [],
            lastIndex: row.index
          };
        }
        raceGroups[row.raceId].rows.push(row);
        raceGroups[row.raceId].lastIndex =
          Math.max(raceGroups[row.raceId].lastIndex,row.index);
      });

      const groups = Object.values(raceGroups);
      groups.sort(function(a,b){
        return b.lastIndex - a.lastIndex;
      });

      let latestGroup = groups[0];

      /*
       * If DRIVER DATA is newest-first instead of oldest-first,
       * the group containing sheet row 2 should be the newest.
       * Prefer a group touching index 0 when one exists.
       */
      const firstRowGroup = groups.find(function(group){
        return group.rows.some(function(row){ return row.index === 0; });
      });

      if(firstRowGroup){
        latestGroup = firstRowGroup;
      }

      const field = latestGroup.rows.slice().sort(function(a,b){
        if(a.finish !== b.finish) return a.finish - b.finish;
        return a.index - b.index;
      });

      const raceTrack = field[0] ? field[0].track : "";
      const raceDate = field[0] ? field[0].date : "";

      const resultParts = field.map(function(row){
        const carText = row.car ? " #" + row.car : "";
        return '<span class="ticker-position">P' + row.finish + '</span> ' +
               '<b>' + row.driver + '</b>' +
               carText;
      });

      let header = '<b>LATEST HOSTED RACE RESULTS</b>';

      if(raceTrack){
        header += ' • ' + raceTrack.toUpperCase();
      }

      if(raceDate){
        header += ' • ' + raceDate;
      }

      header += ' • ' + field.length + ' DRIVERS';

      ticker.innerHTML =
        header +
        '<em>◆</em>' +
        resultParts.join('<em>◆</em>') +
        '<em>◆</em><b>HIGH LINE RACING NETWORK</b>';

      // Slow the crawl slightly for a full-field result list.
      const totalDrivers = Math.max(field.length,1);
      const duration = Math.max(32, Math.min(95, 26 + totalDrivers * 1.55));
      ticker.style.animationDuration = duration + "s";

      console.log("HLRN FULL RESULTS TICKER LOADED",{
        raceId: latestGroup.raceId,
        track: raceTrack,
        date: raceDate,
        field: field
      });

    }catch(error){
      console.error("HLRN RESULTS TICKER ERROR:",error);

      ticker.innerHTML =
        '<b>HLRN RESULTS</b><em>◆</em>' +
        'RESULTS CURRENTLY UNAVAILABLE • CHECK THE LATEST HOSTED RACE DATA';
    }
  }

  document.addEventListener("DOMContentLoaded",function(){
    loadLatestHostedFinishingOrder();
    setTimeout(loadLatestHostedFinishingOrder,2500);
  });

  // Refresh periodically so a newly imported hosted race appears
  // without editing the page.
  setInterval(loadLatestHostedFinishingOrder,60000);

})();
