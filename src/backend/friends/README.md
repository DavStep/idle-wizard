# Friends Backend

`FriendsBackendFacade` is the client boundary for friend requests, accepted
friendships, and private messages. Relationship lists remain subscribed while
online. Direct-message rows subscribe only for the currently open conversation.

The server owns every mutation. Unfriending deletes only the friendship, so the
existing conversation stays visible but `send_direct_message` rejects new copy
until the players become friends again.

Friend and request projections include the player's current alliance tag and
tag color so relationship rows can render the same `[TAG]` identity used by
other social surfaces.

An incoming request projects a red notification through the player avatar,
the own-player Friends button, and the Friends dialog's `Asked You` tab. The
notification remains until the request is accepted or rejected.
