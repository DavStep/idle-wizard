# Friends Backend

`FriendsBackendFacade` is the client boundary for friend requests, accepted
friendships, and private messages. Relationship lists remain subscribed while
online. Direct-message rows subscribe only for the currently open conversation.

The server owns every mutation. Unfriending deletes only the friendship, so the
existing conversation stays visible but `send_direct_message` rejects new copy
until the players become friends again.
