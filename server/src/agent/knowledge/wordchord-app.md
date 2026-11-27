# WordChord — App Documentation

## Creating Songs
To create a new song, click the "New Song" button in your song library. You only need a title to get started. After creation, open the song in the editor to add sections, chords, artist name, key, and capo.

## Song Editor
The song editor lets you organize your song into sections and place chords above specific words.

### Sections
A song can have multiple sections: Verse, Chorus, Bridge, Intro, Outro, or Custom. Each section contains lines of text. You can reorder sections by dragging them.

### Adding Chords
Click on any word in a section to open the chord picker. Select a chord to place it above that word. Click an existing chord to change or remove it.

### Song Metadata
- Title: the name of the song (required)
- Artist: the artist or band name (optional)
- Key: the musical key of the song, for example Am, G, or C
- Capo: the capo fret position, 0 means no capo
- Language: Hebrew or English, affects the text direction (right-to-left for Hebrew)

## Deleting and Restoring Songs
Deleting a song moves it to the trash — it is not permanently deleted immediately. Songs in the trash can be restored within 30 days. To restore, go to your song library and open the deleted songs section, then click restore. Songs can also be permanently deleted from the trash, which cannot be undone.

## Collaboration
WordChord supports collaboration so multiple people can work on the same song.

### Adding Friends
You must be friends with someone before inviting them to collaborate. Go to the Friends page, search by email, and send a friend request. They must accept before you can invite them to a song.

### Inviting Collaborators
The song owner opens the collaboration panel inside the song editor and invites a friend. The friend receives a notification and can accept or decline. Once accepted, they appear as an editor on the song.

### Invite Links
Owners can generate a shareable invite link. Anyone with the link can join the song as an editor. Links expire after a set time and can be refreshed.

### Roles
- Owner: full control — can edit directly, invite collaborators, remove collaborators, and accept or reject proposals
- Editor: can view the song and propose changes, but cannot edit the main song directly

### Proposing Changes
Editors work on a private draft of the song's sections. When ready, they submit the draft as a proposal. The owner sees all pending proposals and can review them.

### Accepting and Rejecting Proposals
When an owner accepts a proposal, the song sections are updated and a version snapshot is saved to history. If the proposal is rejected, the editor is notified and can revise their draft.

### Version History
Every accepted proposal creates a version snapshot. You can view the full history of a song to see how it changed over time.

## AI Assistant
The WordChord AI assistant is a chat interface that lets you manage your song library using natural language.

### What the AI Can Do
- List your songs
- Show details of a specific song
- Create a new song with a title
- Update a song's title, artist, key, capo, or language
- Delete a song (moves it to trash)
- Restore a deleted song from trash
- Search your songs by meaning, for example "find me a sad song"
- Remember personal facts about you across sessions, like your instrument or skill level

### Switching AI Models
The chat widget header has two pills — Claude and GPT-4o. Click either to switch the AI model for that conversation.

### What the AI Cannot Do
The AI assistant cannot edit a song's sections or chord placements. Those must be done in the song editor directly.

## Notifications
WordChord sends in-app notifications for collaboration events: incoming friend requests, collaboration invites, proposal submissions, and proposal accept or reject decisions. The notification bell is in the top navigation bar.

## Dark Mode
Toggle dark mode using the sun and moon icon in the navigation bar. Your preference is saved automatically.

## Languages
The app UI supports English and Hebrew. Switch using the language toggle in the navigation bar. Hebrew mode enables right-to-left layout. The language of a song's lyrics is set separately per song in the editor.
