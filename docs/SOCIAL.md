# CHECKMATE social features

## Player discovery

The signed-in community page lets players add each other using a CHECKMATE Player ID. It reads the minimal `publicProfiles/{uid}` document (display name and avatar only); private email/account data remains in `players/{uid}`, which is owner-readable only.

## Friend requests

Friend request IDs are deterministic per unordered pair of player UIDs. A request can be created by its sender, read by its two participants, and accepted or rejected only by its recipient. Accepting a request and creating the corresponding friendship record happen in one Firestore batch; the Firestore rules use `getAfter()` to verify the accepted request.

## Messaging

One-to-one conversations are available only to current friends. Message documents are immutable after creation, limited to 2,000 characters, and can only be created by their sender. Conversation membership and friendship are checked by Firestore rules on reads and writes.

## Current limitations

- Player discovery currently uses shareable Player IDs rather than public username search.
- Text messages only; attachments, voice notes, read receipts, typing indicators, block/report tools, and moderation workflows are not yet implemented.
- Friend request and message rate limits should be enforced server-side before public launch.
- Users can remove a friendship; this also removes access to its conversation, while the retained records are not automatically deleted.
