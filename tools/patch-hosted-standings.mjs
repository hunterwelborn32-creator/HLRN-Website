/* Optional one-time patch of the user's existing combined Standings HTML.
 * Only modifies the Hosted Racing embedded document's data fetch. Its other
 * three Hosted tabs (driver stats / records / H2H) remain untouched. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [,,input,output]=process.argv;
if(!input||!output) throw new Error('Usage: node tools/patch-hosted-standings.mjs input.html output.html');
const original=await readFile(resolve(input),'utf8');
const pattern=/(racing:&quot;)([A-Za-z0-9+/=]+)(&quot;)/;
const match=original.match(pattern);
if(!match) throw new Error('Hosted racing embedded document not found; no output written.');
const raw=Buffer.from(match[2],'base64').toString('utf8');
const old=`      const response = await fetch(API_URL + "?action=data", {cache:"default"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();`;
const replacement=`      // Shared verified Hosted snapshot first; the existing Hosted API is a fallback.
      // Only the data source changes. All original Hosted tabs and history remain.
      let data = null;
      try {
        const sharedURL = window.top.location.origin + '/data/hlrn.json';
        const sharedResponse = await fetch(sharedURL, {cache:'no-store'});
        if(sharedResponse.ok){
          const envelope = await sharedResponse.json();
          if(envelope?.hosted && Array.isArray(envelope.hosted.sessions) &&
             Array.isArray(envelope.hosted.rankings) &&
             Array.isArray(envelope.hosted.latest?.results)) data=envelope.hosted;
        }
      } catch(sharedError) { console.warn('Hosted shared snapshot unavailable; using original source', sharedError); }
      if(!data){
        const response = await fetch(API_URL + "?action=data", {cache:"default"});
        if (!response.ok) throw new Error("HTTP " + response.status);
        data = await response.json();
      }`;
if(!raw.includes(old)) throw new Error('Original Hosted loader has changed; patch intentionally stopped.');
const edited=raw.replace(old,replacement);
const encoded=Buffer.from(edited,'utf8').toString('base64');
const out=original.replace(match[0],match[1]+encoded+match[3]);
if(out===original) throw new Error('No change made');
await writeFile(resolve(output),out,'utf8');
console.log('Patched Hosted Racing shared-first loader; legacy source retained as fallback.');
