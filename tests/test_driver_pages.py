import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "build-driver-pages.py"
spec = importlib.util.spec_from_file_location("driver_pages", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class DriverPageTests(unittest.TestCase):
    def test_slug(self):
        self.assertEqual(mod.slugify("Hunter Welborn"), "hunter-welborn")
        self.assertEqual(mod.slugify("TJ Lunn"), "tj-lunn")

    def test_render_contains_permanent_seo_and_both_series(self):
        driver = {
            "name": "Hunter Welborn",
            "slug": "hunter-welborn",
            "number": "66",
            "photoSlug": "hunter-welborn",
            "teams": {"sunday": "Helix", "monday": "HLR"},
            "records": {
                "sunday": {
                    "rank": 10, "points": 300, "races": 8, "wins": 1, "top5": 2, "top10": 5,
                    "avgFinish": 11.2, "laps": 900, "lapsLed": 30, "incidents": 80,
                    "results": [{"raceNumber": 1, "track": "Daytona", "date": "2026-06-14T04:00:00Z",
                                 "start": 5, "finish": 2, "points": 50, "lapsLed": 4, "incidents": 5, "status": "Running"}]
                },
                "monday": {
                    "rank": 12, "points": 200, "races": 6, "wins": 0, "top5": 1, "top10": 3,
                    "avgFinish": 12.0, "laps": 700, "lapsLed": 10, "incidents": 45, "results": []
                }
            }
        }
        html = mod.render_page(driver)
        self.assertIn("https://highlineracingnetwork.com/drivers/hunter-welborn/", html)
        self.assertIn("Hunter Welborn", html)
        self.assertIn("#66", html)
        self.assertIn("Sunday Night League", html)
        self.assertIn("Monday Night League", html)
        self.assertIn("Helix", html)
        self.assertIn("HLR", html)
        self.assertIn('"@type": "Person"', html)

    def test_hosted_alias_and_records(self):
        hlrn = {
            "hosted": {
                "latest": {
                    "track": "Talladega Superspeedway",
                    "date": "9/26/2026",
                    "results": [
                        {
                            "position": "25",
                            "driver": "Justin Lee Pearson",
                            "carNumber": "58",
                            "start": "10",
                            "lapsLed": "0",
                            "incidents": "18",
                        }
                    ],
                },
                "sessions": [
                    {
                        "date": "7/16/2026",
                        "track": "EchoPark Speedway (Atlanta)",
                        "carNumber": "19",
                        "driver": "Ethan Fonseca Moreno",
                    }
                ],
                "rankings": [
                    {
                        "rank": "3",
                        "driver": "Ethan Fonseca Moreno",
                        "races": "18",
                        "wins": "6",
                        "top5": "12",
                        "top10": "13",
                        "averageFinish": "10.5",
                    },
                    {
                        "rank": "7",
                        "driver": "Justin Lee Pearson",
                        "races": "51",
                        "wins": "5",
                        "top5": "13",
                        "top10": "14",
                        "averageFinish": "19.47",
                    },
                ],
            }
        }

        records, numbers, aliases = mod.hosted_profile_records(hlrn)
        self.assertIn("Ethan Moreno", records)
        self.assertNotIn("Ethan Fonseca Moreno", records)
        self.assertEqual(aliases["Ethan Moreno"], ["Ethan Fonseca Moreno"])
        self.assertEqual(numbers["Ethan Moreno"], "19")
        self.assertEqual(records["Ethan Moreno"]["rank"], "3")

        self.assertIn("Justin Lee Pearson", records)
        self.assertEqual(numbers["Justin Lee Pearson"], "58")
        self.assertEqual(records["Justin Lee Pearson"]["results"][0]["finish"], "25")
        self.assertEqual(records["Justin Lee Pearson"]["results"][0]["track"], "Talladega Superspeedway")

    def test_render_supports_hosted_series(self):
        driver = {
            "name": "Justin Lee Pearson",
            "slug": "justin-lee-pearson",
            "number": "58",
            "photoSlug": "justin-lee-pearson",
            "teams": {"hosted": None},
            "records": {
                "hosted": {
                    "rank": 7,
                    "points": None,
                    "races": 51,
                    "wins": 5,
                    "top5": 13,
                    "top10": 14,
                    "avgFinish": 19.47,
                    "laps": None,
                    "lapsLed": None,
                    "incidents": None,
                    "results": [],
                }
            },
        }
        html = mod.render_page(driver)
        self.assertIn("Hosted Racing", html)
        self.assertIn("series-card hosted", html)
        self.assertIn("Justin Lee Pearson", html)


if __name__ == "__main__":
    unittest.main()
