const HLRN_SHEET_ID =
"1YfY22x2dnI9T6Fi69pT3L91NAkmVQWdvL0IWbWhB-tM";

const HLRN_ALL_SESSIONS_SHEET =
"ALL SESSIONS";

const HLRN_LATEST_SHEET =
"LATEST SESSION";

const HLRN_RANKINGS_SHEET =
"DRIVER RANKINGS";


/* =========================================================
   GET GOOGLE SHEETS RANGE
   ========================================================= */

async function getHLRNRange(sheetName, range) {

    const url =
        "https://docs.google.com/spreadsheets/d/" +
        HLRN_SHEET_ID +
        "/gviz/tq" +
        "?sheet=" +
        encodeURIComponent(sheetName) +
        "&range=" +
        encodeURIComponent(range) +
        "&tqx=out:json";

    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            "Google Sheets connection failed."
        );
    }

    const text =
        await response.text();

    const start =
        text.indexOf("{");

    const end =
        text.lastIndexOf("}");

    if (
        start === -1 ||
        end === -1
    ) {
        throw new Error(
            "Invalid Google Sheets response."
        );
    }

    const data =
        JSON.parse(
            text.substring(
                start,
                end + 1
            )
        );

    if (
        !data.table ||
        !data.table.rows
    ) {
        return [];
    }

    return data.table.rows.map(
        row =>
            (row.c || []).map(
                cell => {

                    if (!cell) {
                        return "";
                    }

                    return String(
                        cell.f ??
                        cell.v ??
                        ""
                    ).trim();

                }
            )
    );
}


/* =========================================================
   GET ONE CELL
   ========================================================= */

async function getHLRNCell(
    sheetName,
    cell
) {

    const rows =
        await getHLRNRange(
            sheetName,
            cell
        );

    if (
        !rows.length ||
        !rows[0].length
    ) {
        return "";
    }

    return rows[0][0] || "";
}


/* =========================================================
   LOAD SHEET DATA

   IMPORTANT:
   The homepage now uses ROW 2 of ALL SESSIONS for the
   latest race. Code.gs automatically keeps ALL SESSIONS
   sorted newest → oldest, so Row 2 is always the newest
   hosted race.
   ========================================================= */

async function loadHLRNData() {

    try {

        /* =================================================
           NEWEST HOSTED RACE

           ALL SESSIONS columns:
           A = Race Date
           B = Track
           C = Car #
           D = Driver Name
           E = Start Position
           F = Laps Led
           G = Incidents
           H = Average Lap
           ================================================= */

        const newestRaceRows =
            await getHLRNRange(
                HLRN_ALL_SESSIONS_SHEET,
                "A2:H2"
            );

        const newestRace =
            newestRaceRows.length
                ? newestRaceRows[0]
                : [];

        const date =
            newestRace[0] || "";

        const track =
            newestRace[1] || "";

        const winner =
            newestRace[3] || "";


        /* =================================================
           LATEST SESSION STATISTICS
           ================================================= */

        const drivers =
            await getHLRNCell(
                HLRN_LATEST_SHEET,
                "E3"
            );

        const strength =
            await getHLRNCell(
                HLRN_LATEST_SHEET,
                "H3"
            );

        const laps =
            await getHLRNCell(
                HLRN_LATEST_SHEET,
                "E4"
            );

        const cautions =
            await getHLRNCell(
                HLRN_LATEST_SHEET,
                "H4"
            );

        const cautionLaps =
            await getHLRNCell(
                HLRN_LATEST_SHEET,
                "E5"
            );

        const leadChanges =
            await getHLRNCell(
                HLRN_LATEST_SHEET,
                "H5"
            );


        /* =================================================
           DRIVER RANKING

           DRIVER RANKINGS:
           A = Rank
           B = Driver
           C = Races
           D = Wins
           E = Top 5
           F = Top 10
           G = Average Finish
           ================================================= */

        const rankingRows =
            await getHLRNRange(
                HLRN_RANKINGS_SHEET,
                "A2:G4"
            );

        const ranking = [];

        for (
            let row = 0;
            row < 3;
            row++
        ) {

            const current =
                rankingRows[row] || [];

            ranking.push({

                rank:
                    current[0] || "",

                driver:
                    current[1] || "",

                races:
                    current[2] || "",

                wins:
                    current[3] || "",

                top5:
                    current[4] || "",

                top10:
                    current[5] || "",

                average:
                    current[6] || ""

            });
        }


        /* =================================================
           LAST RACE CARD
           ================================================= */

        document.getElementById(
            "lastRaceTrack"
        ).textContent =
            track || "Unknown";

        document.getElementById(
            "lastRaceDate"
        ).textContent =
            date || "Unknown";

        document.getElementById(
            "lastRaceDrivers"
        ).textContent =
            drivers
                ? drivers + " Drivers"
                : "Unknown";

        const winnerElement =
            document.getElementById("lastRaceWinner");

        winnerElement.textContent =
            winner || "Unknown";

        if (winner) {
            winnerElement.classList.add("home-driver-profile-link");
            winnerElement.setAttribute("role", "button");
            winnerElement.setAttribute("tabindex", "0");
            winnerElement.title = "View driver profile";

            winnerElement.onclick = function() {
                openHomeDriverProfile(winner);
            };

            winnerElement.onkeydown = function(event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openHomeDriverProfile(winner);
                }
            };
        }


        /* =================================================
           RACE STATS
           ================================================= */

        document.getElementById(
            "raceStatDrivers"
        ).textContent =
            drivers || "--";

        document.getElementById(
            "raceStatLaps"
        ).textContent =
            laps || "--";

        document.getElementById(
            "raceStatCautions"
        ).textContent =
            cautions || "--";

        document.getElementById(
            "raceStatCautionLaps"
        ).textContent =
            cautionLaps || "--";

        document.getElementById(
            "raceStatLeadChanges"
        ).textContent =
            leadChanges || "--";

        document.getElementById(
            "raceStatStrength"
        ).textContent =
            strength || "--";

        document.getElementById(
            "raceStatsTrack"
        ).textContent =
            track || "HLRN HOSTED RACE";


        /* =================================================
           DRIVER SPOTLIGHT
           ================================================= */

        ranking.forEach(
            (driver, index) => {

                const place =
                    index + 1;

                const driverElement =
                    document.getElementById(
                        "spotlightDriver" +
                        place
                    );

                const racesElement =
                    document.getElementById(
                        "spotlightRaces" +
                        place
                    );

                const winsElement =
                    document.getElementById(
                        "spotlightWins" +
                        place
                    );

                const top5Element =
                    document.getElementById(
                        "spotlightTop5" +
                        place
                    );

                const top10Element =
                    document.getElementById(
                        "spotlightTop10" +
                        place
                    );

                const averageElement =
                    document.getElementById(
                        "spotlightAverage" +
                        place
                    );

                if (driverElement) {
                    driverElement.textContent =
                        driver.driver ||
                        "Unknown Driver";

                    driverElement.classList.add("home-driver-profile-link");
                    driverElement.setAttribute("role", "button");
                    driverElement.setAttribute("tabindex", "0");
                    driverElement.title = "View driver profile";
                    driverElement.onclick = function(){
                        openHomeDriverProfile(driver.driver);
                    };
                    driverElement.onkeydown = function(event){
                        if(event.key === "Enter" || event.key === " "){
                            event.preventDefault();
                            openHomeDriverProfile(driver.driver);
                        }
                    };
                }

                if (racesElement) {
                    racesElement.textContent =
                        driver.races || "--";
                }

                if (winsElement) {
                    winsElement.textContent =
                        driver.wins || "--";
                }

                if (top5Element) {
                    top5Element.textContent =
                        driver.top5 || "--";
                }

                if (top10Element) {
                    top10Element.textContent =
                        driver.top10 || "--";
                }

                if (averageElement) {
                    averageElement.textContent =
                        driver.average || "--";
                }

            }
        );


        console.log(
            "HLRN DATA LOADED",
            {
                newestRace,
                drivers,
                strength,
                track,
                laps,
                cautions,
                date,
                cautionLaps,
                leadChanges,
                winner,
                ranking
            }
        );

    }

    catch(error) {

        console.error(
            "HLRN ERROR:",
            error
        );

    }

}



/* =========================================================
   INCIDENT WATCH TAB
========================================================= */

function showHLRNTab(tab) {

    const home =
        document.getElementById("homeTab");

    const incidents =
        document.getElementById("incidentTab");

    const homeButton =
        document.getElementById("homeTabButton");

    const incidentButton =
        document.getElementById("incidentTabButton");

    if (tab === "incidents") {

        home.style.display = "none";
        incidents.style.display = "block";

        homeButton.classList.remove("active");
        incidentButton.classList.add("active");

        loadHLRNIncidentData();

    } else {

        home.style.display = "block";
        incidents.style.display = "none";

        incidentButton.classList.remove("active");
        homeButton.classList.add("active");

    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function loadHLRNIncidentData() {

    const top10Element =
        document.getElementById("incidentTop10");

    const averagesElement =
        document.getElementById("incidentAverages");

    try {

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
         *
         * We read D:J so:
         * index 0 = Driver
         * index 6 = Incidents
         */

        const rows =
            await getHLRNRange(
                "DRIVER DATA",
                "D2:J"
            );

        const drivers = {};

        rows.forEach(function(row) {

            const name =
                String(row[0] || "").trim();

            const incidents =
                Number(
                    String(row[6] || "")
                        .replace(/,/g, "")
                );

            if (!name) {
                return;
            }

            if (!drivers[name]) {
                drivers[name] = {
                    driver: name,
                    races: 0,
                    total: 0
                };
            }

            drivers[name].races++;

            if (Number.isFinite(incidents)) {
                drivers[name].total += incidents;
            }

        });

        const allIncidentDrivers =
            Object.values(drivers);

        const driverList =
            allIncidentDrivers
                .filter(function(driver) {
                    return driver.races >= 2;
                });

        const averageDriverList =
            allIncidentDrivers
                .filter(function(driver) {
                    return driver.races >= 10;
                });

        /*
         * TOP 10:
         * Highest TOTAL incident points first.
         */
        const top10 =
            driverList
                .slice()
                .sort(function(a, b) {
                    return b.total - a.total;
                })
                .slice(0, 10);

        if (!top10.length) {

            top10Element.innerHTML =
                '<div class="incident-empty">' +
                'No incident data available yet.' +
                '</div>';

        } else {

            top10Element.innerHTML =
                top10.map(function(driver, index) {

                    const rank =
                        index + 1;

                    let icon =
                        String(rank);

                    let label =
                        "INCIDENT POINTS";

                    if (rank === 1) {
                        icon = "🚨";
                        label = "INCIDENT LEADER";
                    } else if (rank === 2) {
                        icon = "⚠️";
                    } else if (rank === 3) {
                        icon = "🔶";
                    }

                    return `
                        <div class="incident-row rank-${rank}">
                            <div class="incident-rank">${icon}</div>

                            <div class="incident-driver">
                                <div class="incident-driver-name">
                                    ${escapeHLRNIncidentHTML(driver.driver)}
                                </div>

                                <div class="incident-driver-label">
                                    ${label} • ${driver.races} race${driver.races === 1 ? "" : "s"}
                                </div>
                            </div>

                            <div class="incident-points">
                                <strong>${formatHLRNIncidentNumber(driver.total)}</strong>
                                <span>Total Incident Points</span>
                            </div>
                        </div>
                    `;

                }).join("");

        }

        /*
         * DRIVER INCIDENT AVERAGES:
         * 10+ races only. Display 15 per page.
         */
        const averages =
            averageDriverList
                .map(function(driver) {
                    return {
                        driver: driver.driver,
                        races: driver.races,
                        total: driver.total,
                        average:
                            driver.races
                                ? driver.total / driver.races
                                : 0
                    };
                })
                .sort(function(a, b) {
                    if (b.average !== a.average) {
                        return b.average - a.average;
                    }
                    return b.total - a.total;
                });

        window.hlrnIncidentAverages = averages;
        window.hlrnIncidentAveragePage = 1;
        renderHLRNIncidentAverages();

    } catch (error) {

        console.error(
            "HLRN INCIDENT WATCH ERROR:",
            error
        );

        top10Element.innerHTML =
            '<div class="incident-empty">' +
            'Unable to load incident data.' +
            '</div>';

        averagesElement.innerHTML =
            '<div class="incident-empty">' +
            'Unable to load driver averages.' +
            '</div>';

    }

}



function filterHLRNIncidentAverages() {
    window.hlrnIncidentAveragePage = 1;
    renderHLRNIncidentAverages();
}

function changeHLRNIncidentPage(direction) {
    const list = window.hlrnIncidentAverages || [];
    const search = (
        document.getElementById("incidentAverageSearch")?.value || ""
    ).trim().toLowerCase();

    const filtered = list.filter(function(driver) {
        return String(driver.driver || "").toLowerCase().includes(search);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / 15));

    window.hlrnIncidentAveragePage = Math.min(
        totalPages,
        Math.max(1, (window.hlrnIncidentAveragePage || 1) + direction)
    );

    renderHLRNIncidentAverages();
}

function renderHLRNIncidentAverages() {
    const averagesElement = document.getElementById("incidentAverages");
    const pageInfo = document.getElementById("incidentAveragePageInfo");
    const pagination = document.getElementById("incidentAveragePagination");
    const list = window.hlrnIncidentAverages || [];

    const search = (
        document.getElementById("incidentAverageSearch")?.value || ""
    ).trim().toLowerCase();

    const filtered = list.filter(function(driver) {
        return String(driver.driver || "").toLowerCase().includes(search);
    });

    const perPage = 15;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

    let page = Number(window.hlrnIncidentAveragePage || 1);
    page = Math.min(totalPages, Math.max(1, page));
    window.hlrnIncidentAveragePage = page;

    if (!filtered.length) {
        averagesElement.innerHTML =
            '<div class="incident-empty">' +
            (search
                ? 'No drivers match your search.'
                : 'No drivers with 10+ races yet.') +
            '</div>';
    } else {
        const start = (page - 1) * perPage;
        const visible = filtered.slice(start, start + perPage);

        averagesElement.innerHTML = visible.map(function(driver) {
            return `
                <div class="incident-average-item">
                    <div class="incident-average-driver">
                        ${escapeHLRNIncidentHTML(driver.driver)}
                    </div>
                    <div class="incident-average-number">
                        ${driver.races}
                    </div>
                    <div class="incident-average-number">
                        ${formatHLRNIncidentNumber(driver.total)}
                    </div>
                    <div class="incident-average-number avg">
                        ${driver.average.toFixed(1)}
                    </div>
                </div>
            `;
        }).join("");
    }

    if (pageInfo) {
        pageInfo.textContent = "PAGE " + page + " OF " + totalPages;
    }

    if (pagination) {
        const buttons = pagination.querySelectorAll("button");
        if (buttons.length >= 2) {
            buttons[0].disabled = page <= 1;
            buttons[1].disabled = page >= totalPages;
        }
    }
}

function formatHLRNIncidentNumber(value) {

    return Number(value || 0)
        .toLocaleString(
            "en-US",
            {
                maximumFractionDigits: 0
            }
        );

}


function escapeHLRNIncidentHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   START
   ========================================================= */

loadHLRNData();


/* =========================================================
   AUTOMATIC UPDATE

   Refresh the homepage data every 5 minutes.
   A visitor does NOT need to manually edit the page.
   ========================================================= */

setInterval(
    function() {
        loadHLRNData();

        const incidentTab =
            document.getElementById("incidentTab");

        if (
            incidentTab &&
            incidentTab.style.display !== "none"
        ) {
            loadHLRNIncidentData();
        }
    },
    5 * 60 * 1000
);
