## ADDED Requirements

### Requirement: Send Discord notification per notifyUser listing
The system SHALL send one Discord message per listing where the analysis result has `notifyUser: true`, after all analyses for the run are complete.

#### Scenario: One or more listings with notifyUser true
- **WHEN** `runNotifier(db)` is called and analyses exist with `notifyUser: true` from the current run
- **THEN** one Discord message is sent per such listing via the `DISCORD_WEBHOOK` environment variable

#### Scenario: No listings with notifyUser true
- **WHEN** `runNotifier(db)` is called and no analyses have `notifyUser: true`
- **THEN** no Discord message is sent

#### Scenario: DISCORD_WEBHOOK not set
- **WHEN** `DISCORD_WEBHOOK` is not set in the environment
- **THEN** the notifier logs a warning and exits without error

---

### Requirement: Discord message content
Each Discord message SHALL contain the listing address, total score, explanation from the analysis, and the booli.se URL.

#### Scenario: Message is sent
- **WHEN** a Discord notification is triggered for a listing
- **THEN** the message includes: address (or "Unknown address" if null), total score, the explanation text, and the booli.se listing URL as a clickable link
