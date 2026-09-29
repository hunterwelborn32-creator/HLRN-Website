/* HLRN Results core script block 1 */
/* =========================================================
   HLRN RACE CENTER
   AUTOMATIC SCHEDULE SYSTEM
========================================================= */


/* =========================================================
   RACE TIME
========================================================= */

const SCHEDULE_TIME_ZONE =
    "America/New_York";

const RACE_HOUR = 20;

const RACE_MINUTE = 30;


/* =========================================================
   YOUTUBE LINKS
========================================================= */

const SUNDAY_YOUTUBE =
    "https://www.youtube.com/@High_Line_Racing/streams";

const MONDAY_YOUTUBE =
    "https://www.youtube.com/@rsibroadcasting/streams";


/* =========================================================
   SUNDAY SCHEDULE
========================================================= */

const sundaySchedule = [

    {
        week: 1,
        date: "2026-06-14",
        track: "DAYTONA",
        car: "GEN 7",
        laps: 100,
        tires: "4 SETS",
        miles: "2.50",
        banking: "31°",
        location: "DAYTONA BEACH, FL",
        type: "TRI-OVAL",
        description:
            "Daytona International Speedway is one of the most famous superspeedways in racing. High-speed drafting and pack racing make this a major HLRN event."
    },

    {
        off: true,
        date: "2026-06-21",
        reason: "OFF DAY — FATHER'S DAY"
    },

    {
        week: 2,
        date: "2026-06-28",
        track: "IOWA",
        car: "TRUCKS",
        laps: 200,
        tires: "5 SETS",
        miles: "0.875",
        banking: "12°",
        location: "NEWTON, IA",
        type: "SHORT OVAL",
        description:
            "Iowa Speedway is a tight short oval where tire management, braking and multiple racing grooves are critical."
    },

    {
        off: true,
        date: "2026-07-05",
        reason: "OFF — INDEPENDENCE DAY WEEKEND"
    },

    {
        week: 3,
        date: "2026-07-12",
        track: "CHICAGOLAND",
        car: "ARCA",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "18°",
        location: "JOLIET, IL",
        type: "TRI-OVAL",
        description:
            "Chicagoland Speedway is a fast 1.5-mile tri-oval where tire wear and multiple racing lanes can play a major role."
    },

    {
        week: 4,
        date: "2026-07-19",
        track: "ECHOPARK",
        car: "GEN 6",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "24°",
        location: "HAMPTON, GA",
        type: "OVAL",
        description:
            "EchoPark Speedway provides a fast oval racing environment where drivers must manage speed, tires and traffic throughout the race."
    },

    {
        off: true,
        date: "2026-07-26",
        reason: "OFF WEEK"
    },

    {
        off: true,
        date: "2026-08-02",
        reason: "OFF WEEK"
    },

    {
        week: 5,
        date: "2026-08-09",
        track: "CHARLOTTE",
        car: "GEN 7",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "24°",
        location: "CONCORD, NC",
        type: "QUAD-OVAL",
        description:
            "Charlotte Motor Speedway is a 1.5-mile quad-oval and one of NASCAR's most recognizable racing venues."
    },

    {
        week: 6,
        date: "2026-08-16",
        track: "TEXAS",
        car: "TRUCKS",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "20°-24°",
        location: "FORT WORTH, TX",
        type: "QUAD-OVAL",
        description:
            "Texas Motor Speedway is a high-speed 1.5-mile quad-oval known for intense side-by-side racing and multiple racing grooves."
    },

    {
        week: 7,
        date: "2026-08-23",
        track: "AUTO CLUB",
        car: "ARCA",
        laps: 125,
        tires: "5 SETS",
        miles: "2.00",
        banking: "18°",
        location: "FONTANA, CA",
        type: "D-SHAPED OVAL",
        description:
            "Auto Club Speedway is a wide, fast oval that rewards momentum and allows drivers to use multiple racing lanes."
    },

    {
        week: 8,
        date: "2026-08-30",
        track: "TALLADEGA",
        car: "GEN 6",
        laps: 100,
        tires: "5 SETS",
        miles: "2.66",
        banking: "33°",
        location: "TALLADEGA, AL",
        type: "SUPERSPEEDWAY",
        description:
            "Talladega Superspeedway is one of the fastest tracks on the schedule and features intense drafting and pack racing."
    },

    {
        off: true,
        date: "2026-09-06",
        reason: "OFF — LABOR DAY WEEKEND"
    },

    {
        week: 9,
        date: "2026-09-13",
        track: "HOMESTEAD-MIAMI",
        car: "GEN 7",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "18°-20°",
        location: "HOMESTEAD, FL",
        type: "OVAL",
        description:
            "Homestead-Miami Speedway features progressive banking and rewards drivers who manage their tires throughout a run."
    },

    {
        week: 10,
        date: "2026-09-20",
        track: "MICHIGAN",
        car: "TRUCKS",
        laps: 125,
        tires: "5 SETS",
        miles: "2.00",
        banking: "18°",
        location: "BROOKLYN, MI",
        type: "D-SHAPED OVAL",
        description:
            "Michigan International Speedway is a wide, high-speed two-mile oval featuring multiple racing grooves and long green-flag runs."
    },

    {
        week: 11,
        date: "2026-09-27",
        track: "INDIANAPOLIS",
        car: "ARCA",
        laps: 100,
        tires: "5 SETS",
        miles: "2.50",
        banking: "9°",
        location: "INDIANAPOLIS, IN",
        type: "OVAL",
        description:
            "Indianapolis Motor Speedway is one of the most historic racing venues in the world and features a flat, demanding oval."
    },

    {
        week: 12,
        date: "2026-10-04",
        track: "IRACING SUPERSPEEDWAY",
        car: "GEN 6",
        laps: 100,
        tires: "5 SETS",
        miles: "2.50",
        banking: "31°",
        location: "IRACING",
        type: "SUPERSPEEDWAY",
        description:
            "iRacing Superspeedway provides high-speed pack racing where drafting, positioning and pit strategy are critical."
    },

    {
        week: 13,
        date: "2026-10-11",
        track: "KANSAS",
        car: "GEN 7",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "15°",
        location: "KANSAS CITY, KS",
        type: "TRI-OVAL",
        description:
            "Kansas Speedway is a fast 1.5-mile tri-oval where tire wear and changing track conditions can determine the outcome."
    },

    {
        week: 14,
        date: "2026-10-18",
        track: "LAS VEGAS",
        car: "TRUCKS",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "20°",
        location: "LAS VEGAS, NV",
        type: "TRI-OVAL",
        description:
            "Las Vegas Motor Speedway is a high-speed tri-oval known for long green-flag runs and multiple racing lanes."
    },

    {
        week: 15,
        date: "2026-10-25",
        track: "DAYTONA",
        car: "ARCA",
        laps: 100,
        tires: "5 SETS",
        miles: "2.50",
        banking: "31°",
        location: "DAYTONA BEACH, FL",
        type: "TRI-OVAL",
        description:
            "Daytona returns for another high-speed superspeedway race where drafting and strategy are critical."
    },

    {
        week: 16,
        date: "2026-11-01",
        track: "TALLADEGA",
        car: "GEN 6",
        laps: 100,
        tires: "5 SETS",
        miles: "2.66",
        banking: "33°",
        location: "TALLADEGA, AL",
        type: "SUPERSPEEDWAY",
        description:
            "Talladega closes the Sunday season with a high-speed season finale where drafting and pack positioning can decide the winner.",
        finale: true
    }

];


/* =========================================================
   MONDAY SCHEDULE
========================================================= */

const mondaySchedule = [

    {
        week: 1,
        date: "2026-08-17",
        track: "DAYTONA",
        car: "GEN 7",
        laps: 100,
        tires: "4 SETS",
        miles: "2.50",
        banking: "31°",
        location: "DAYTONA BEACH, FL",
        type: "TRI-OVAL",
        description:
            "Daytona International Speedway is one of NASCAR's most famous superspeedways, featuring high speeds, drafting and close pack racing."
    },

    {
        week: 2,
        date: "2026-08-24",
        track: "IOWA",
        car: "TRUCKS",
        laps: 200,
        tires: "5 SETS",
        miles: "0.875",
        banking: "12°",
        location: "NEWTON, IA",
        type: "SHORT OVAL",
        description:
            "Iowa Speedway is a short oval known for progressive banking, multiple lanes and demanding tire management."
    },

    {
        week: 3,
        date: "2026-08-31",
        track: "CHICAGOLAND",
        car: "ARCA",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "18°",
        location: "JOLIET, IL",
        type: "TRI-OVAL",
        description:
            "Chicagoland Speedway is a fast 1.5-mile tri-oval featuring multiple racing grooves and long green-flag runs."
    },

    {
        week: 4,
        date: "2026-09-14",
        track: "ECHOPARK",
        car: "GEN 7",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "24°",
        location: "HAMPTON, GA",
        type: "OVAL",
        description:
            "EchoPark Speedway provides a fast oval racing environment where drivers must manage speed, tires and traffic throughout the race."
    },

    {
        week: 5,
        date: "2026-09-21",
        track: "CHARLOTTE",
        car: "GEN 7",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "24°",
        location: "CONCORD, NC",
        type: "QUAD-OVAL",
        description:
            "Charlotte Motor Speedway is a 1.5-mile quad-oval and one of NASCAR's most recognizable racing facilities."
    },

    {
        week: 6,
        date: "2026-09-28",
        track: "TEXAS",
        car: "TRUCKS",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "20°-24°",
        location: "FORT WORTH, TX",
        type: "QUAD-OVAL",
        description:
            "Texas Motor Speedway is a high-speed 1.5-mile quad-oval known for intense side-by-side racing."
    },

    {
        week: 7,
        date: "2026-10-05",
        track: "AUTO CLUB",
        car: "ARCA",
        laps: 100,
        tires: "5 SETS",
        miles: "2.00",
        banking: "18°",
        location: "FONTANA, CA",
        type: "D-SHAPED OVAL",
        description:
            "Auto Club Speedway is a wide, fast oval that rewards momentum and allows drivers to use multiple racing lanes."
    },

    {
        week: 8,
        date: "2026-10-12",
        track: "TALLADEGA",
        car: "TRUCKS",
        laps: 100,
        tires: "5 SETS",
        miles: "2.66",
        banking: "33°",
        location: "TALLADEGA, AL",
        type: "SUPERSPEEDWAY",
        description:
            "Talladega Superspeedway is one of the fastest tracks on the schedule and features intense drafting and pack racing."
    },

    {
        week: 9,
        date: "2026-10-19",
        track: "HOMESTEAD-MIAMI",
        car: "GEN 7",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "18°-20°",
        location: "HOMESTEAD, FL",
        type: "OVAL",
        description:
            "Homestead-Miami Speedway features progressive banking and rewards drivers who manage their tires throughout a run."
    },

    {
        week: 10,
        date: "2026-10-26",
        track: "MICHIGAN",
        car: "TRUCKS",
        laps: 125,
        tires: "5 SETS",
        miles: "2.00",
        banking: "18°",
        location: "BROOKLYN, MI",
        type: "D-SHAPED OVAL",
        description:
            "Michigan International Speedway is a wide, high-speed two-mile oval featuring multiple racing grooves."
    },

    {
        week: 11,
        date: "2026-11-02",
        track: "MARTINSVILLE",
        car: "ARCA",
        laps: 100,
        tires: "5 SETS",
        miles: "0.526",
        banking: "12°",
        location: "RIDGEWAY, VA",
        type: "SHORT OVAL",
        description:
            "Martinsville Speedway is a historic short track famous for tight corners, heavy braking and intense short-track racing."
    },

    {
        week: 12,
        date: "2026-11-09",
        track: "IRACING SUPERSPEEDWAY",
        car: "TRUCKS",
        laps: 100,
        tires: "5 SETS",
        miles: "2.50",
        banking: "31°",
        location: "IRACING",
        type: "SUPERSPEEDWAY",
        description:
            "iRacing Superspeedway provides high-speed pack racing with drafting and close side-by-side competition."
    },

    {
        week: 13,
        date: "2026-11-16",
        track: "KANSAS",
        car: "GEN 7",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "15°",
        location: "KANSAS CITY, KS",
        type: "TRI-OVAL",
        description:
            "Kansas Speedway is a fast 1.5-mile tri-oval where tire wear and changing track conditions can determine the outcome."
    },

    {
        week: 14,
        date: "2026-11-23",
        track: "LAS VEGAS",
        car: "TRUCKS",
        laps: 175,
        tires: "5 SETS",
        miles: "1.50",
        banking: "20°",
        location: "LAS VEGAS, NV",
        type: "TRI-OVAL",
        description:
            "Las Vegas Motor Speedway is a high-speed tri-oval known for long green-flag runs and multiple racing lanes."
    },

    {
        week: 15,
        date: "2026-11-30",
        track: "DAYTONA",
        car: "ARCA",
        laps: 100,
        tires: "5 SETS",
        miles: "2.50",
        banking: "31°",
        location: "DAYTONA BEACH, FL",
        type: "TRI-OVAL",
        description:
            "Daytona returns for another high-speed superspeedway race where drafting and strategy are critical."
    },

    {
        week: 16,
        date: "2026-12-07",
        track: "TALLADEGA",
        car: "GEN 7",
        laps: 100,
        tires: "5 SETS",
        miles: "2.66",
        banking: "33°",
        location: "TALLADEGA, AL",
        type: "SUPERSPEEDWAY",
        description:
            "Talladega closes the Monday season with a high-speed season finale where drafting and pack positioning can decide the winner.",
        finale: true
    }

];


/* =========================================================
   EASTERN TIME → UTC
========================================================= */

function easternTimeToUTC(
    dateString,
    hour,
    minute
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split("-")
            .map(Number);


    let utcGuess =
        Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute,
            0,
            0
        );


    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const localParts =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone:
                        SCHEDULE_TIME_ZONE,

                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",

                    hourCycle: "h23"
                }
            )
            .formatToParts(
                new Date(
                    utcGuess
                )
            );


        const values = {};


        localParts.forEach(
            part => {

                if (
                    part.type !== "literal"
                ) {

                    values[
                        part.type
                    ] =
                        part.value;
                }
            }
        );


        const displayedUTC =
            Date.UTC(
                Number(values.year),
                Number(values.month) - 1,
                Number(values.day),
                Number(values.hour),
                Number(values.minute),
                Number(values.second)
            );


        const desiredUTC =
            Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                0
            );


        const difference =
            displayedUTC -
            desiredUTC;


        utcGuess -=
            difference;
    }


    return new Date(
        utcGuess
    );
}


/* =========================================================
   GET RACE START
========================================================= */

function getRaceStart(
    race
) {

    return easternTimeToUTC(
        race.date,
        RACE_HOUR,
        RACE_MINUTE
    );
}


/* =========================================================
   GET LOCAL RACE END
========================================================= */

function getLocalRaceEnd(
    start
) {

    const localDate =
        new Date(
            start.getTime()
        );


    const localParts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                year: "numeric",
                month: "numeric",
                day: "numeric"
            }
        )
        .formatToParts(
            localDate
        );


    const values = {};


    localParts.forEach(
        part => {

            if (
                part.type !== "literal"
            ) {

                values[
                    part.type
                ] =
                    Number(
                        part.value
                    );
            }
        }
    );


    const tomorrow =
        new Date();

    tomorrow.setFullYear(
        values.year,
        values.month - 1,
        values.day
    );

    tomorrow.setHours(
        24,
        0,
        0,
        0
    );


    return tomorrow;
}


/* =========================================================
   FIND CURRENT / NEXT RACE
========================================================= */

function findRace(
    schedule
) {

    const now =
        new Date();


    const races =
        schedule.filter(
            race =>
                !race.off
        );


    for (
        let i = 0;
        i < races.length;
        i++
    ) {

        const race =
            races[i];


        const start =
            getRaceStart(
                race
            );


        const end =
            getLocalRaceEnd(
                start
            );


        /*
            LIVE
        */

        if (
            now >= start &&
            now < end
        ) {

            return {

                race: race,

                mode: "live"
            };
        }


        /*
            NEXT RACE
        */

        if (
            now < start
        ) {

            return {

                race: race,

                mode: "countdown"
            };
        }
    }


    return {

        race: null,

        mode: "complete"
    };
}


/* =========================================================
   VISITOR DATE
========================================================= */

function formatVisitorDate(
    race
) {

    const start =
        getRaceStart(
            race
        );


    return new Intl.DateTimeFormat(
        undefined,
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    )
    .format(
        start
    );
}


/* =========================================================
   VISITOR TIME
========================================================= */

function formatVisitorTime(
    race
) {

    const start =
        getRaceStart(
            race
        );


    return new Intl.DateTimeFormat(
        undefined,
        {
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short"
        }
    )
    .format(
        start
    );
}


/* =========================================================
   COUNTDOWN
========================================================= */

function updateCountdown(
    race,
    prefix
) {

    const now =
        new Date();


    const start =
        getRaceStart(
            race
        );


    let difference =
        start.getTime() -
        now.getTime();


    if (
        difference < 0
    ) {

        difference = 0;
    }


    const days =
        Math.floor(
            difference /
            (
                1000 *
                60 *
                60 *
                24
            )
        );


    const hours =
        Math.floor(
            (
                difference /
                (
                    1000 *
                    60 *
                    60
                )
            ) % 24
        );


    const minutes =
        Math.floor(
            (
                difference /
                (
                    1000 *
                    60
                )
            ) % 60
        );


    const seconds =
        Math.floor(
            (
                difference /
                1000
            ) % 60
        );


    document.getElementById(
        prefix + "Days"
    ).textContent =
        String(
            days
        ).padStart(
            2,
            "0"
        );


    document.getElementById(
        prefix + "Hours"
    ).textContent =
        String(
            hours
        ).padStart(
            2,
            "0"
        );


    document.getElementById(
        prefix + "Minutes"
    ).textContent =
        String(
            minutes
        ).padStart(
            2,
            "0"
        );


    document.getElementById(
        prefix + "Seconds"
    ).textContent =
        String(
            seconds
        ).padStart(
            2,
            "0"
        );
}


/* =========================================================
   UPDATE LEAGUE
========================================================= */

function updateLeague(
    result,
    prefix,
    youtube
) {

    /*
        SEASON COMPLETE
    */

    if (
        result.mode === "complete"
    ) {

        document.getElementById(
            prefix + "Track"
        ).textContent =
            "SEASON COMPLETE";


        document.getElementById(
            prefix + "Week"
        ).textContent =
            "";


        document.getElementById(
            prefix + "Date"
        ).textContent =
            "";


        document.getElementById(
            prefix + "Time"
        ).textContent =
            "";


        document.getElementById(
            prefix + "Summary"
        ).textContent =
            "";


        document.getElementById(
            prefix + "CountdownSection"
        ).style.display =
            "none";


        document.getElementById(
            prefix + "Live"
        ).classList.remove(
            "active"
        );


        document.getElementById(
            prefix + "Complete"
        ).classList.add(
            "active"
        );


        return;
    }


    const race =
        result.race;


    document.getElementById(
        prefix + "Complete"
    ).classList.remove(
        "active"
    );


    /*
        BASIC INFORMATION
    */

    document.getElementById(
        prefix + "Week"
    ).textContent =
        "WEEK " +
        race.week;


    document.getElementById(
        prefix + "Track"
    ).textContent =
        race.track;


    document.getElementById(
        prefix + "Date"
    ).textContent =
        formatVisitorDate(
            race
        );


    document.getElementById(
        prefix + "Time"
    ).textContent =
        formatVisitorTime(
            race
        );


    document.getElementById(
        prefix + "Summary"
    ).textContent =
        race.car +
        " • " +
        race.laps +
        " LAPS • " +
        race.tires;


    /*
        TRACK INFORMATION
    */

    document.getElementById(
        prefix + "Description"
    ).textContent =
        race.description;


    document.getElementById(
        prefix + "Miles"
    ).textContent =
        race.miles;


    document.getElementById(
        prefix + "Banking"
    ).textContent =
        race.banking;


    document.getElementById(
        prefix + "Location"
    ).textContent =
        race.location;


    document.getElementById(
        prefix + "Type"
    ).textContent =
        race.type;


    /*
        RACE INFORMATION
    */

    document.getElementById(
        prefix + "Car"
    ).textContent =
        race.car;


    document.getElementById(
        prefix + "Laps"
    ).textContent =
        race.laps;


    document.getElementById(
        prefix + "Tires"
    ).textContent =
        race.tires;


    /*
        LIVE
    */

    if (
        result.mode === "live"
    ) {

        document.getElementById(
            prefix + "CountdownSection"
        ).style.display =
            "none";


        const live =
            document.getElementById(
                prefix + "Live"
            );


        live.classList.add(
            "active"
        );


        live.querySelector(
            ".live-button"
        ).href =
            youtube;

    }


    /*
        COUNTDOWN
    */

    else {

        document.getElementById(
            prefix + "CountdownSection"
        ).style.display =
            "block";


        document.getElementById(
            prefix + "Live"
        ).classList.remove(
            "active"
        );


        updateCountdown(
            race,
            prefix
        );
    }
}


/* =========================================================
   MAIN UPDATE
========================================================= */

function updateRaceCenter() {

    const sunday =
        findRace(
            sundaySchedule
        );


    const monday =
        findRace(
            mondaySchedule
        );


    updateLeague(
        sunday,
        "sunday",
        SUNDAY_YOUTUBE
    );


    updateLeague(
        monday,
        "monday",
        MONDAY_YOUTUBE
    );
}


/* =========================================================
   START
========================================================= */

updateRaceCenter();


/*
    UPDATE EVERY SECOND

    The page does not need to be refreshed.

    Countdown
       ↓
    Race starts
       ↓
    LIVE NOW
       ↓
    Next race
       ↓
    Countdown
       ↓
    LIVE NOW
*/

setInterval(
    updateRaceCenter,
    1000
);


/* =========================================================
   PROMO RACE WEEK BADGES
========================================================= */

/* Sunday promo badge follows the currently displayed Sunday race. */
function updatePromoSundayWeek() {
    const sundayResult = findRace(sundaySchedule);
    const target = document.getElementById("promoSundayWeek");

    if (!target) return;

    if (sundayResult && sundayResult.race && sundayResult.race.week) {
        target.textContent = sundayResult.race.week;
    } else {
        target.textContent = "16";
    }
}

/* Monday promo badge follows the currently displayed Monday race. */
function updatePromoMondayWeek() {
    const mondayResult = findRace(mondaySchedule);
    const target = document.getElementById("promoMondayWeek");

    if (!target) return;

    if (mondayResult && mondayResult.race && mondayResult.race.week) {
        target.textContent = mondayResult.race.week;
    } else {
        target.textContent = "16";
    }
}

updatePromoSundayWeek();
updatePromoMondayWeek();
setInterval(updatePromoSundayWeek, 1000);
setInterval(updatePromoMondayWeek, 1000);


/* =========================================================
   NEXT 4 HLRN EVENTS
========================================================= */

function formatEventShortDate(race) {
    const start = getRaceStart(race);

    return new Intl.DateTimeFormat(
        undefined,
        {
            weekday: "short",
            month: "short",
            day: "numeric"
        }
    ).format(start);
}

function getNextFourEvents() {
    /*
        The large Sunday and Monday countdowns already show the
        next/current race for each league.

        This section must start AFTER those displayed races.
        Example on Sept. 1:
          Sunday countdown = Week 9 Homestead-Miami
          Monday countdown = Week 4 EchoPark

        Therefore NEXT 4 begins with:
          Sunday Week 10 Michigan
          Monday Week 5 Charlotte
          Sunday Week 11 Indianapolis
          Monday Week 6 Texas
    */

    const sundayCurrent = findRace(sundaySchedule);
    const mondayCurrent = findRace(mondaySchedule);

    const sundayCurrentStart =
        sundayCurrent && sundayCurrent.race
            ? getRaceStart(sundayCurrent.race).getTime()
            : -Infinity;

    const mondayCurrentStart =
        mondayCurrent && mondayCurrent.race
            ? getRaceStart(mondayCurrent.race).getTime()
            : -Infinity;

    const sundayEvents = sundaySchedule
        .filter(race => !race.off)
        .map(race => ({
            ...race,
            league: "SUNDAY",
            leagueClass: "sunday",
            start: getRaceStart(race)
        }))
        // Strictly AFTER the race already shown in the Sunday countdown.
        .filter(event => event.start.getTime() > sundayCurrentStart)
        .sort((a, b) => a.start - b.start)
        .slice(0, 2);

    const mondayEvents = mondaySchedule
        .filter(race => !race.off)
        .map(race => ({
            ...race,
            league: "MONDAY",
            leagueClass: "monday",
            start: getRaceStart(race)
        }))
        // Strictly AFTER the race already shown in the Monday countdown.
        .filter(event => event.start.getTime() > mondayCurrentStart)
        .sort((a, b) => a.start - b.start)
        .slice(0, 2);

    /*
        Keep the same visual pattern:
        Sunday left, Monday right,
        then the following Sunday and Monday.
    */
    const events = [];

    for (let i = 0; i < 2; i++) {
        if (sundayEvents[i]) events.push(sundayEvents[i]);
        if (mondayEvents[i]) events.push(mondayEvents[i]);
    }

    return events.slice(0, 4);
}


function getEventCountdown(event) {
    const now = new Date();
    let difference = event.start.getTime() - now.getTime();

    if (difference < 0) difference = 0;

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / (1000 * 60)) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return {
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0")
    };
}

function updateNextFourEvents() {
    const grid = document.getElementById("nextEventsGrid");
    if (!grid) return;

    const now = new Date();
    const events = getNextFourEvents();

    if (!events.length) {
        grid.innerHTML =
            '<div class="next-events-empty">NO UPCOMING EVENTS SCHEDULED</div>';
        return;
    }

    grid.innerHTML = events.map(event => {
        const end = getLocalRaceEnd(event.start);
        const isLive = now >= event.start && now < end;
        const countdown = getEventCountdown(event);

        return `
            <div class="next-event-card ${event.leagueClass}">
                <div class="next-event-status ${isLive ? "live" : ""}">
                    ${isLive ? "LIVE" : "UPCOMING"}
                </div>

                <div class="next-event-league">
                    ${event.league} NIGHT LEAGUE
                </div>

                <div class="next-event-week">
                    WEEK ${event.week}
                </div>

                <div class="next-event-track" title="${event.track}">
                    ${event.track}
                </div>

                <div class="next-event-date">
                    ${formatEventShortDate(event)}
                    •
                    ${formatVisitorTime(event)}
                </div>

                <div class="next-event-details">
                    ${event.car} • ${event.laps} LAPS • ${event.tires}
                </div>

                <div class="next-event-countdown">
                    <div class="next-event-countdown-box">
                        <span class="next-event-countdown-num">${countdown.days}</span>
                        <span class="next-event-countdown-label">DAYS</span>
                    </div>
                    <div class="next-event-countdown-box">
                        <span class="next-event-countdown-num">${countdown.hours}</span>
                        <span class="next-event-countdown-label">HOURS</span>
                    </div>
                    <div class="next-event-countdown-box">
                        <span class="next-event-countdown-num">${countdown.minutes}</span>
                        <span class="next-event-countdown-label">MIN</span>
                    </div>
                    <div class="next-event-countdown-box">
                        <span class="next-event-countdown-num">${countdown.seconds}</span>
                        <span class="next-event-countdown-label">SEC</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

updateNextFourEvents();
setInterval(updateNextFourEvents, 1000);



/* =========================================================
   HLRN RACE CENTER — VISUAL MOTION HELPERS
   No race schedule/data values are changed here.
========================================================= */
(function(){
  const root=document.querySelector('.hlrn-race-center');
  if(!root) return;

  const pitStripe=document.createElement('div');
  pitStripe.className='hlrn-pit-stripe';
  root.appendChild(pitStripe);

  // atmosphere layers
  const grid=document.createElement('div');
  grid.className='motion-grid';
  root.prepend(grid);

  const streaks=document.createElement('div');
  streaks.className='speed-streaks';
  streaks.innerHTML='<i></i><i></i><i></i><i></i>';
  root.prepend(streaks);

  const progress=document.createElement('div');
  progress.className='hlrn-progress';
  progress.innerHTML='<span></span>';
  document.body.appendChild(progress);
  const progressBar=progress.firstElementChild;

  const glow=document.createElement('div');
  glow.className='hlrn-cursor-glow';
  document.body.appendChild(glow);

  document.addEventListener('pointermove',e=>{
    glow.style.left=e.clientX+'px';
    glow.style.top=e.clientY+'px';
  },{passive:true});

  const updateProgress=()=>{
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    const pct=Math.min(100,Math.max(0,(window.scrollY/max)*100));
    progressBar.style.width=pct+'%';
  };
  updateProgress();
  addEventListener('scroll',updateProgress,{passive:true});
  addEventListener('resize',updateProgress,{passive:true});

  const revealTargets=[
    '.bottom-area','.hlrn-promo','.next-events-section','.footer-line'
  ];
  revealTargets.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.classList.add('hlrn-reveal')));

  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('hlrn-visible');
          io.unobserve(entry.target);
        }
      });
    },{threshold:.12,rootMargin:'0px 0px -5% 0px'});
    document.querySelectorAll('.hlrn-reveal').forEach(el=>io.observe(el));
  }else{
    document.querySelectorAll('.hlrn-reveal').forEach(el=>el.classList.add('hlrn-visible'));
  }

  // very light 3D response on desktop; content and controls remain clickable.
  if(matchMedia('(min-width: 901px) and (pointer:fine)').matches){
    document.querySelectorAll('.race-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        const x=(e.clientX-r.left)/r.width-.5;
        const y=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`translateY(-6px) perspective(900px) rotateX(${(-y*1.8).toFixed(2)}deg) rotateY(${(x*2.3).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave',()=>{card.style.transform='';});
    });
  }
})();


/* HLRN Results core script block 2 */
/* HLRN ULTRA presentation bridge — reads existing Race Center values only. */
(function ultraRaceCenter(){
 const $=id=>document.getElementById(id);
 const pad=n=>String(n).padStart(2,'0');
 function easternClock(){
   try{$('ultraClock').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(new Date());}catch(e){}
 }
 function text(id){const e=$(id);return e?e.textContent.trim():''}
 function isLive(){return ($('sundayLive')&&$('sundayLive').classList.contains('active'))||($('mondayLive')&&$('mondayLive').classList.contains('active'))}
 function parseDate(id){const v=text(id);const d=new Date(v);return isNaN(d)?null:d}
 function refreshUltra(){
   easternClock();
   const live=isLive(), dot=$('ultraLiveDot'); if(dot)dot.classList.toggle('on',live);
   const status=$('ultraCenterStatus'); if(status)status.innerHTML=live?'RACE STATUS <span>LIVE NOW</span> • BROADCAST AVAILABLE':'SYSTEM <span>ONLINE</span> • AUTOMATIC RACE CENTER';
   const sw=text('sundayWeek'); const mw=text('mondayWeek');
   if($('ultraSundayWeek'))$('ultraSundayWeek').textContent=sw||'WEEK --'; if($('ultraMondayWeek'))$('ultraMondayWeek').textContent=mw||'WEEK --';
   document.querySelectorAll('.race-card').forEach(c=>c.classList.remove('ultra-live-card'));
   if($('sundayLive')&&$('sundayLive').classList.contains('active')) $('sundayLive').closest('.race-card')?.classList.add('ultra-live-card');
   if($('mondayLive')&&$('mondayLive').classList.contains('active')) $('mondayLive').closest('.race-card')?.classList.add('ultra-live-card');

   let league='',track='',date='',week='';
   const sd=parseDate('sundayDate'), md=parseDate('mondayDate'), now=new Date();
   const choices=[];
   if(sd)choices.push({d:sd,l:'SUNDAY NIGHT',t:text('sundayTrack'),date:text('sundayDate'),w:text('sundayWeek')});
   if(md)choices.push({d:md,l:'MONDAY NIGHT',t:text('mondayTrack'),date:text('mondayDate'),w:text('mondayWeek')});
   choices.sort((a,b)=>Math.abs(a.d-now)-Math.abs(b.d-now));
   if(choices.length){const n=choices[0];league=n.l;track=n.t;date=n.date;week=n.w;}
   if(live){
      if($('sundayLive')?.classList.contains('active')){league='SUNDAY NIGHT';track=text('sundayTrack');date='LIVE NOW';week=text('sundayWeek')}
      else {league='MONDAY NIGHT';track=text('mondayTrack');date='LIVE NOW';week=text('mondayWeek')}
      if($('ultraNextKicker'))$('ultraNextKicker').textContent='HLRN LIVE EVENT';
   } else if($('ultraNextKicker')) $('ultraNextKicker').textContent='NEXT HLRN EVENT';
   if($('ultraNextEvent'))$('ultraNextEvent').textContent=(league&&track)?league+' • '+track:'RACE WEEK';
   if($('ultraNextMeta'))$('ultraNextMeta').textContent=[week,date,'GREEN FLAG 8:30 PM ET'].filter(Boolean).join(' • ');
 }
 setInterval(refreshUltra,500); refreshUltra();
})();


/* HLRN Results core script block 3 */
/* BILLION X bridge: presentation only. Existing schedule arrays/functions stay authoritative. */
(function(){
  const $=id=>document.getElementById(id);
  const txt=id=>$(id)?$(id).textContent.trim():'';
  function live(id){return !!($(id)&&$(id).classList.contains('active'));}
  function status(prefix){
    if(live(prefix+'Live')) return 'LIVE NOW';
    const complete=$(prefix+'Complete');
    if(complete&&complete.classList.contains('active')) return 'COMPLETE';
    const d=txt(prefix+'Days'),h=txt(prefix+'Hours'),m=txt(prefix+'Minutes');
    if(d==='00'&&h==='00'&&m==='00') return 'RACE DAY';
    return 'UPCOMING';
  }
  function refreshBX(){
    const sLive=live('sundayLive'),mLive=live('mondayLive');
    const sWeek=txt('sundayWeek')||'WEEK --',mWeek=txt('mondayWeek')||'WEEK --';
    if($('bxSunWeek')) $('bxSunWeek').textContent=sWeek;
    if($('bxMonWeek')) $('bxMonWeek').textContent=mWeek;
    if($('bxSundayStatus')) $('bxSundayStatus').textContent=status('sunday');
    if($('bxMondayStatus')) $('bxMondayStatus').textContent=status('monday');
    if($('bxLiveState')) $('bxLiveState').textContent=(sLive||mLive)?'ON AIR':'STANDBY';
    let race=''; let meta='';
    if(sLive){race='SUNDAY NIGHT • '+txt('sundayTrack');meta=sWeek+' • LIVE NOW • HIGH LINE RACING';}
    else if(mLive){race='MONDAY NIGHT • '+txt('mondayTrack');meta=mWeek+' • LIVE NOW • RSI BROADCASTING';}
    else {
      const sDays=Number(txt('sundayDays')||999), sHours=Number(txt('sundayHours')||0);
      const mDays=Number(txt('mondayDays')||999), mHours=Number(txt('mondayHours')||0);
      const sScore=sDays*24+sHours, mScore=mDays*24+mHours;
      if(sScore<=mScore){race='SUNDAY NIGHT • '+txt('sundayTrack');meta=sWeek+' • '+txt('sundayDate')+' • '+txt('sundayTime');}
      else{race='MONDAY NIGHT • '+txt('mondayTrack');meta=mWeek+' • '+txt('mondayDate')+' • '+txt('mondayTime');}
    }
    if($('bxNextRace')) $('bxNextRace').textContent=race||'HLRN RACE WEEK';
    if($('bxNextMeta')) $('bxNextMeta').textContent=meta||'AUTOMATIC SCHEDULE FEED';
  }
  document.querySelectorAll('.race-card').forEach(card=>{if(!card.querySelector('.bx-lane')){const lane=document.createElement('i');lane.className='bx-lane';card.prepend(lane);}});
  const root=document.querySelector('.hlrn-race-center');
  if(root){const scan=document.createElement('div');scan.className='bx-scanline';root.appendChild(scan);const a=document.createElement('div');a.className='bx-corner tl';root.appendChild(a);const b=document.createElement('div');b.className='bx-corner tr';root.appendChild(b);}
  refreshBX(); setInterval(refreshBX,500);
})();


/* HLRN Results core script block 4 */
document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('.hlrn-race-center');
  const ticker=document.querySelector('.hlrn-race-ticker');
  const leagueGrid=document.querySelector('.league-grid');
  const nextEvents=document.querySelector('.next-events-section');
  const partners=document.querySelector('.bottom-area');
  const promo=document.querySelector('.hlrn-promo');
  if(!root||!leagueGrid) return;

  if(!document.querySelector('.hy-next-green')){
    const panel=document.createElement('section');
    panel.className='hy-next-green';
    panel.setAttribute('aria-label','Next green flag');
    panel.innerHTML=`
      <div class="hy-next-main">
        <div class="hy-kicker">Next Green Flag</div>
        <div class="hy-event" id="hyNextEvent">Calculating Race Week…</div>
        <div class="hy-meta" id="hyNextMeta">Automatic HLRN schedule system</div>
      </div>
      <div class="hy-next-cell green"><strong id="hySundayWeek">W--</strong><span>Sunday Night</span></div>
      <div class="hy-next-cell red"><strong id="hyMondayWeek">W--</strong><span>Monday Night</span></div>
      <div class="hy-next-cell yellow"><strong>8:30</strong><span>Eastern Green</span></div>`;
    if(ticker) ticker.insertAdjacentElement('afterend',panel); else leagueGrid.insertAdjacentElement('beforebegin',panel);
  }

  const addHead=(before,title,sub,cls)=>{
    if(!before||document.querySelector('.'+cls)) return;
    const h=document.createElement('div');h.className='hy-section-head '+cls;
    h.innerHTML=`<h2>${title}</h2><p>${sub}</p>`;
    before.insertAdjacentElement('beforebegin',h);
  };
  addHead(leagueGrid,'This Week at HLRN','Sunday and Monday race programs','hy-head-week');

  if(nextEvents){
    addHead(nextEvents,'Up Next','The next four scheduled HLRN events','hy-head-next');
    leagueGrid.insertAdjacentElement('afterend',document.querySelector('.hy-head-next'));
    document.querySelector('.hy-head-next').insertAdjacentElement('afterend',nextEvents);
  }
  if(partners){
    addHead(partners,'Official Partners','HLRN racing and broadcast partners','hy-head-partners');
    if(nextEvents) nextEvents.insertAdjacentElement('afterend',document.querySelector('.hy-head-partners'));
    document.querySelector('.hy-head-partners').insertAdjacentElement('afterend',partners);
  }
  if(promo){
    addHead(promo,'HLRN Network','Race • Broadcast • Compete','hy-head-network');
    if(partners) partners.insertAdjacentElement('afterend',document.querySelector('.hy-head-network'));
    document.querySelector('.hy-head-network').insertAdjacentElement('afterend',promo);
  }

  const sync=()=>{
    const read=id=>document.getElementById(id)?.textContent?.trim()||'—';
    const evt=document.getElementById('ultraNextEvent');
    const meta=document.getElementById('ultraNextMeta');
    document.getElementById('hyNextEvent').textContent=evt?.textContent?.trim()||'HLRN Race Week';
    document.getElementById('hyNextMeta').textContent=meta?.textContent?.trim()||'Automatic HLRN schedule system';
    document.getElementById('hySundayWeek').textContent=read('sundayWeek').replace(/^WEEK\s*/i,'W');
    document.getElementById('hyMondayWeek').textContent=read('mondayWeek').replace(/^WEEK\s*/i,'W');
  };
  sync();
  const observer=new MutationObserver(sync);
  ['ultraNextEvent','ultraNextMeta','sundayWeek','mondayWeek'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{subtree:true,childList:true,characterData:true});});
});
