# CHECKMATE ratings

The current multiplayer MVP uses a simple Elo implementation:

- New players start at 1500 in each rating pool.
- Separate pools are maintained for blitz, rapid, and classical time controls.
- K-factor is 32.
- Completed server-authoritative games update both players atomically with the game record in Firestore.
- The game record stores rating before/after values and the result reason.
- The leaderboard reads the public rating fields from `publicProfiles`.

This is a provisional rating system, not Glicko-2. There is no rating deviation, inactivity adjustment, provisional-game counter, seasonal reset, anti-cheat review, or rated/casual matchmaking split yet. All online matches currently affect ratings; local practice and computer games do not.
