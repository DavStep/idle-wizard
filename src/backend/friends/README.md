# Friends Backend

`FriendsBackendFacade` is the client boundary for friend requests, accepted
friendships, and private messages. Relationship lists remain subscribed while
online. Direct-message rows subscribe only for the currently open conversation.

The server owns every mutation. Unfriending deletes only the friendship, so the
existing conversation stays visible but `send_direct_message` rejects new copy
until the players become friends again.

The player profile owns `allowFriendRequests`, defaulting to allowed. The
server rejects new requests while the recipient disables it; existing pending
requests remain available to accept or reject.

Friend and request projections include the player's current alliance tag and
tag color so relationship rows can render the same `[TAG]` identity used by
other social surfaces.

Accepted-friend projections include the latest message body from that private
conversation so every Friends row can preview the most recent direct message.

An incoming request projects a red notification through the player avatar,
the own-player Friends button, and the Friends dialog's `Asked You` tab. The
notification remains until the request is accepted or rejected.
