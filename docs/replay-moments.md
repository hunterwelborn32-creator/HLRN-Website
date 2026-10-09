# HLRN Replay Moment Synchronization

The Broadcast Center reads `/data/replay-moments.json`. It displays only entries with `verified: true` and a valid 11-character YouTube video ID; individual moments require nonnegative integer `seconds` measured **from the start of the YouTube video**.

## Input format

```json
{
  "schemaVersion": 1,
  "replays": [{
    "league": "sunday",
    "videoId": "REPLACE_WITH_ACTUAL_YOUTUBE_ID",
    "verified": false,
    "moments": [
      {"seconds": 1234, "label": "Caution 1"}
    ]
  }]
}
```

## Automated race-night workflow

1. Race PC bridge sends events to HLRN Live Feed, each with UTC `occurredAt` timestamps (including race starts, cautions, restarts, finish). Keep event timestamps in the durable race recap.
2. YouTube broadcast metadata supplies the actual broadcast/video start time. Compute `seconds = round((occurredAt - videoStartUTC) / 1000)`, including any real stream-to-video timeline offsets.
3. Associate the video with a specific HLRN race and league. Validate times against video duration; do not use scheduled 8:30 PM starts as the video start.
4. Publish the checked output as `data/replay-moments.json` with `verified: true` only after synchronization has been confirmed.
5. The Broadcast Center then renders direct timestamped YouTube links.

No race PC is needed to edit or deploy this website configuration. The event capture, accurate video clock alignment, and end-to-end testing require working live event logs and YouTube timing information. No highlights are invented.
