# REDLINE

## Online lobby setup

The game uses PeerJS for WebRTC connections and `lobby-server.js` for the public room list.

Start the lobby service:

```sh
node lobby-server.js
```

Before deploying `index.html`, add this before the module script:

```html
<script>window.REDLINE_LOBBY_API='https://your-lobby-host.example';</script>
```

The service supports `GET /rooms`, `POST /rooms`, `PUT /rooms/:peerId`, and `DELETE /rooms/:peerId`. Hosts send heartbeats every five seconds and rooms expire automatically after fifteen seconds without one.

For GitHub Pages, deploy `lobby-server.js` separately on a small Node host, then set `window.REDLINE_LOBBY_API` to that service URL before the game loads.
