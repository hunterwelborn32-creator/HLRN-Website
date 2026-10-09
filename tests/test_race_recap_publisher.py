import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "publish-race-recap.py"
spec = importlib.util.spec_from_file_location("race_recap_publisher", SCRIPT)
pub = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pub)


def fixture(source="iRacing"):
    def row(pos, idx, number, name, lap):
        return {
            "position": pos, "carIdx": idx, "number": number, "name": name,
            "lapsCompleted": lap, "lapsDown": 0, "status": "ON TRACK",
            "blackFlag": False, "disqualified": False
        }
    snaps = []
    orders = [
        [row(1,0,"82","Chris James",1),row(2,1,"66","Hunter Welborn",1),row(3,2,"12","Trevor Haley",1)],
        [row(1,1,"66","Hunter Welborn",2),row(2,0,"82","Chris James",2),row(3,2,"12","Trevor Haley",2)],
        [row(1,1,"66","Hunter Welborn",3),row(2,2,"12","Trevor Haley",3),row(3,0,"82","Chris James",3)],
    ]
    for lap, order in enumerate(orders, 1):
        snaps.append({"lap": lap, "flag": "GREEN", "order": order})
    return {
        "raceFrozen": True,
        "raceFrozenAt": "2026-09-29T02:30:00Z",
        "sessionKey": "fixture-race",
        "race": {
            "source": source,
            "series": "HLRN Monday Night Series",
            "track": "Texas Motor Speedway — Oval",
            "sessionName": "Race",
            "sessionNum": 2,
            "sessionId": 111,
            "subSessionId": 222,
            "totalLaps": 3,
            "lap": 3,
            "flag": "CHECKERED",
            "sessionState": "CHECKERED",
            "driverCount": 3,
            "drivers": [
                {**orders[-1][0], "bestLapTime": 29.9},
                {**orders[-1][1], "bestLapTime": 30.1},
                {**orders[-1][2], "bestLapTime": 30.0},
            ],
            "raceStats": {},
            "sessionArchive": {},
        },
        "lapSnapshots": snaps,
        "cautionHistory": [{
            "number": 1, "startLap": 2, "restartLap": 3, "completed": True,
            "reason": "Car stopped on racing surface", "reasonSource": "HLRN"
        }],
        "penaltyHistory": [{
            "lap": 2, "title": "Black Flag", "name": "Chris James", "number": "82",
            "reason": "Passing under yellow", "reasonSource": "HLRN"
        }],
        "timelineEvents": [],
    }


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.old = (pub.ROOT, pub.INDEX_PATH, pub.DATA_DIR, pub.ARTICLE_DIR)
        pub.ROOT = root
        pub.INDEX_PATH = root / "data" / "race-recaps" / "index.json"
        pub.DATA_DIR = root / "data" / "race-recaps"
        pub.ARTICLE_DIR = root / "news" / "race-recaps"

    def tearDown(self):
        pub.ROOT, pub.INDEX_PATH, pub.DATA_DIR, pub.ARTICLE_DIR = self.old
        self.tmp.cleanup()

    def test_real_frozen_race_publishes_once(self):
        recap = fixture()
        self.assertTrue(pub.publish(recap))
        index = json.loads(pub.INDEX_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(index["recaps"]), 1)
        item = index["recaps"][0]
        self.assertEqual(item["winner"]["name"], "Hunter Welborn")
        article = pub.ARTICLE_DIR / item["slug"] / "index.html"
        self.assertTrue(article.exists())
        text = article.read_text(encoding="utf-8")
        self.assertIn("Hunter Welborn", text)
        self.assertIn("Texas Motor Speedway", text)
        self.assertFalse(pub.publish(recap))
        index2 = json.loads(pub.INDEX_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(index2["recaps"]), 1)

    def test_cloudflare_frozen_recap_end_to_end_in_temporary_workspace(self):
        """Exercise Cloudflare recorder-shaped data through the real publisher."""
        recap = fixture(source="iRacing")
        recap["sessionKey"] = "cf-subsession|cf-session|0|Race Test|Talladega"
        recap["raceFrozenAt"] = "2026-10-09T18:00:00Z"
        recap["race"]["source"] = "iRacing"
        recap["race"]["track"] = "Talladega Superspeedway"
        recap["race"]["sessionName"] = "Race Test"
        recap["race"]["raceRecorder"] = {
            "source": "HLRN Cloudflare server recorder",
            "completedLapsCaptured": 3,
            "frozen": True,
        }
        recap["timelineEvents"] = [
            {"type": "lap", "lap": 1, "title": "LAP 1 COMPLETED", "text": "Running order saved."},
            {"type": "flag", "lap": 2, "title": "CAUTION #1", "text": "Caution detected."},
            {"type": "flag", "lap": 3, "title": "GREEN FLAG / RESTART", "text": "Restart observed."},
        ]
        response = {"recaps": [recap], "latestFrozenKey": recap["sessionKey"]}
        records = pub.extract_recaps(response)
        self.assertEqual(len(records), 1)
        self.assertTrue(pub.publish(records[0]))

        index = json.loads(pub.INDEX_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(index["recaps"]), 1)
        item = index["recaps"][0]
        self.assertEqual(item["winner"]["name"], "Hunter Welborn")
        self.assertIn("Talladega", item["track"])
        data = json.loads((pub.DATA_DIR / f'{item["slug"]}.json').read_text(encoding="utf-8"))
        self.assertEqual(len(data["recorder"]["lapSnapshots"]), 3)
        self.assertEqual(len(data["recorder"]["cautionHistory"]), 1)
        self.assertEqual(len(data["recorder"]["penaltyHistory"]), 1)
        self.assertEqual(len(data["recorder"]["timelineEvents"]), 3)
        article = pub.ARTICLE_DIR / item["slug"] / "index.html"
        self.assertTrue(article.exists())
        self.assertIn("Talladega", article.read_text(encoding="utf-8"))
        self.assertFalse(pub.publish(records[0]))
        self.assertEqual(len(json.loads(pub.INDEX_PATH.read_text())["recaps"]), 1)

    def test_archive_envelope_exposes_every_recap(self):
        older = fixture()
        newer = fixture()
        older["raceFrozenAt"] = "2026-09-29T02:30:00Z"
        newer["raceFrozenAt"] = "2026-09-30T02:30:00Z"
        newer["race"]["subSessionId"] = 333
        batch = pub.extract_recaps({"schemaVersion": 1, "recaps": [newer, older]})
        self.assertEqual(len(batch), 2)
        ordered = sorted(batch, key=pub.recap_sort_key)
        self.assertEqual(ordered[0]["race"]["subSessionId"], 222)
        self.assertEqual(ordered[1]["race"]["subSessionId"], 333)

    def test_generic_race_series_infers_monday_from_eastern_race_date(self):
        recap = fixture()
        recap["race"]["series"] = "Race"
        # 2026-09-29 02:30 UTC is Monday Sep. 28 at 10:30 PM Eastern.
        model = pub.build_model(recap)
        self.assertEqual(model["series"], "Monday Night Series")

    def test_generic_race_series_infers_sunday_from_eastern_race_date(self):
        recap = fixture()
        recap["race"]["series"] = "Race"
        recap["raceFrozenAt"] = "2026-09-28T02:30:00Z"
        model = pub.build_model(recap)
        self.assertEqual(model["series"], "Sunday Night Series")

    def test_hosted_series_is_not_reclassified_by_weekday(self):
        recap = fixture()
        recap["race"]["series"] = "HLRN Hosted"
        model = pub.build_model(recap)
        self.assertEqual(model["series"], "HLRN Hosted")

    def test_demo_is_never_published(self):
        recap = fixture(source="DEMO")
        ok, reason = pub.is_publishable(recap)
        self.assertFalse(ok)
        self.assertIn("DEMO", reason)
        self.assertFalse(pub.publish(recap))
        self.assertFalse(pub.INDEX_PATH.exists())

    def test_richer_frozen_copy_enriches_existing_race_without_new_url(self):
        first = fixture()
        first["lapSnapshots"] = first["lapSnapshots"][:2]
        first["cautionHistory"][0]["reason"] = "Reason not supplied by iRacing telemetry"
        first["cautionHistory"][0]["reasonSource"] = "UNAVAILABLE"

        self.assertTrue(pub.publish(first))
        index1 = json.loads(pub.INDEX_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(index1["recaps"]), 1)
        original = index1["recaps"][0]
        original_slug = original["slug"]
        original_published = original["publishedAt"]
        original_quality = original["archiveQuality"]

        richer = fixture()
        richer["cautionHistory"][0]["endedUnderYellow"] = True
        richer["cautionHistory"][0]["restartLap"] = None
        self.assertTrue(pub.publish(richer))

        index2 = json.loads(pub.INDEX_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(index2["recaps"]), 1)
        updated = index2["recaps"][0]
        self.assertEqual(updated["slug"], original_slug)
        self.assertEqual(updated["publishedAt"], original_published)
        self.assertGreater(updated["archiveQuality"], original_quality)
        self.assertIn("updatedAt", updated)

        archive = json.loads((pub.DATA_DIR / f"{original_slug}.json").read_text(encoding="utf-8"))
        self.assertEqual(archive["schemaVersion"], 2)
        self.assertEqual(len(archive["recorder"]["lapSnapshots"]), 3)
        self.assertTrue(archive["recorder"]["cautionHistory"][0]["endedUnderYellow"])

        article = (pub.ARTICLE_DIR / original_slug / "index.html").read_text(encoding="utf-8")
        self.assertIn("Finished under caution", article)

        # Re-processing the exact same rich record is idempotent.
        self.assertFalse(pub.publish(richer))


if __name__ == "__main__":
    unittest.main()
