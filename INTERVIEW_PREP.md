# 🎓 Interview Preparation & Code Walkthrough Guide

Use this guide to master the interview and confidently explain every technical decision, design pattern, and optimization in the project.

---

## 🎯 Top 10 Likely Interview Questions & Model Answers

### Q1: "How did you implement real-time drawing sync without lag or canvas resets on React re-renders?"
**Answer:**
> *"We decoupled React's virtual DOM reconciliation from the HTML5 Canvas rendering pipeline. 
> 1. We use React `useRef` to maintain references to the canvas element and active drawing state without triggering state updates on every `mousemove`.
> 2. We use a normalized logical coordinate space of 1000x600. When mouse or touch events fire, client coordinates are scaled relative to the canvas's bounding rect, ensuring that strokes render at the exact same location across all devices regardless of DPI or screen size.
> 3. For the drawer, strokes render immediately to the canvas for zero-latency feedback while streaming `{x, y}` coordinates via `draw_move`. For remote viewers, incoming points are immediately connected via `ctx.lineTo()` with round line-caps, producing smooth strokes without awaiting full stroke completion."*

---

### Q2: "How do you ensure the secret word is never exposed to cheating guessers?"
**Answer:**
> *"Security is enforced entirely on the server. The secret word is never sent in room-wide broadcasts. 
> When the drawer picks a word, the server emits two separate events:
> 1. `secret_word`: Emitted **only** to the drawer's socket ID containing the plaintext word.
> 2. `word_chosen`: Broadcasted to the rest of the room containing only masked blanks (e.g. `_ _ _ _`).
> Guess checking happens server-side via `isExactMatch()`. If a guess is correct, the server announces that the player guessed the word without repeating the word in chat."*

---

### Q3: "How does your scoring algorithm work?"
**Answer:**
> *"Scores are authoritative and computed on the server in `Game.ts`.
> Points scale based on speed: guessers receive a base score of 200 points, plus a time-decay bonus:
> `Math.round(200 + 200 * (timeLeft / drawTime) + rankBonus)`
> The first guesser earns an additional rank bonus. To encourage good drawings, the drawer also receives 50 bonus points per correct guess. Duplicate points and self-guessing by the drawer are strictly prevented."*

---

### Q4: "How does the 'Round Replay' feature work?"
**Answer:**
> *"Every stroke recorded in `Room.ts` stores an array of points and a relative millisecond timestamp from the start of the round.
> When a round ends, the server snapshots these strokes into `roomReplays.set(roundNumber, strokes)`. 
> In the frontend `ReplayModal.tsx`, we implemented a virtual canvas player with Play/Pause controls, a scrubber slider, and speed toggles (1x, 2x, 4x) that renders strokes incrementally, demonstrating real event-sourcing principles."*

---

### Q5: "Why did you choose Render / Node.js Express over Vercel for this application?"
**Answer:**
> *"Skribbl.io requires persistent, stateful WebSocket connections for low-latency bidirectional communication (drawing strokes, countdown ticks, chat messages).
> Vercel and Netlify are serverless platforms with stateless execution environments where Lambda functions shut down after responding to HTTP requests. They do not natively support stateful Socket.IO servers without an external third-party broker like Pusher or Redis.
> Render provides persistent Linux compute environments where Node.js and Socket.IO maintain active WebSocket connections and in-memory room state seamlessly."*

---

### Q6: "What happens if the room host leaves or disconnects?"
**Answer:**
> *"In `Room.removePlayer()`, if the departing socket ID matches `this.hostId`, the room automatically scans its remaining connected players and promotes the next connected player to host, broadcasting the updated `newHostId` to all clients. If all players leave, the room timers are cleared and the room is deleted to prevent memory leaks."*

---

### Q7: "How does close-guess detection work?"
**Answer:**
> *"In `utils/wordMatcher.ts`, we implemented the Levenshtein Distance algorithm. If a player's guess is within an edit distance of 1 (for 4–6 letter words) or 2 (for longer words), the server emits a private system hint to that specific player (`'...' is very close!`) without broadcasting it to the public chat, preventing other players from guessing the word easily."*

---

### Q8: "How does mobile touch input differ from mouse input?"
**Answer:**
> *"Mobile browsers intercept touch gestures for pinch-to-zoom and page scrolling. In `Canvas.tsx`, we intercept `onTouchStart`, `onTouchMove`, and `onTouchEnd`, extracting coordinates from `e.touches[0]` while executing `e.preventDefault()`. Additionally, the CSS property `touch-none` is applied to the canvas element to disable default gesture handling."*

---

### Q9: "What design patterns did you use on the backend?"
**Answer:**
> *"We applied Object-Oriented Domain Driven Design (OOP DDD):
> 1. **Entity Pattern**: `Player` encapsulates user attributes and score modifications.
> 2. **State Machine / Lifecycle Pattern**: `Game` manages phases (`LOBBY` ➔ `SELECTING_WORD` ➔ `DRAWING` ➔ `ROUND_END` ➔ `GAME_OVER`).
> 3. **Aggregate Root**: `Room` owns players, game lifecycle, and drawing strokes.
> 4. **Singleton Manager**: `RoomManager` controls room creation, lookup, and cleanup."*

---

### Q10: "What are known limitations and how would you scale this to 100,000 concurrent users?"
**Answer:**
> *"Currently, state is held in-memory on a single Node.js instance. To scale horizontally across multiple servers:
> 1. We would introduce the `@socket.io/redis-adapter` so sockets across different Node instances can broadcast to the same room.
> 2. Room state would be cached in Redis with TTLs.
> 3. A load balancer with WebSocket sticky sessions (e.g., AWS ALB or Cloudflare) would route players with the same room code to appropriate servers."*
