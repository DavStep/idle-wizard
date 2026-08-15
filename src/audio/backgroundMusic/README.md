# Background Music

Background music owns the quiet looping room soundtrack. It starts only when
the browser or WebView permits audio, pauses while the app is hidden, and waits
briefly before replaying the track.

The device-local `music` preference in `SoundSettingsFacade` enables or mutes
the soundtrack. This is presentation state and never affects gameplay.
