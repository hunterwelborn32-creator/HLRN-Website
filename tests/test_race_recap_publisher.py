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

    def test_demo_is_never_published(self):
        recap = fixture(source="DEMO")
        ok, reason = pub.is_publishable(recap)
        self.assertFalse(ok)
        self.assertIn("DEMO", reason)
        self.assertFalse(pub.publish(recap))
        self.assertFalse(pub.INDEX_PATH.exists())


if __name__ == "__main__":
    unittest.main()
