# Global Discord Role Manager Bot

This bot keeps member roles synchronized from one **main server** to one or more **sub servers**.

## What it does

- Watches role updates in your main server.
- Mirrors selected roles to each sub server based on your mapping.
- Runs a full sync at startup and every 10 minutes to fix missed events.

## Setup

1. Create a Discord bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Enable the **Server Members Intent** under bot settings.
3. Invite the bot to the main and all sub servers with permissions:
   - Manage Roles
   - View Channels
4. Clone this project and install dependencies:

```bash
npm install
```

5. Create your env file:

```bash
cp .env.example .env
```

6. Fill the values in `.env`.
7. Run the bot:

```bash
npm start
```

## Environment variables

- `BOT_TOKEN` - your bot token.
- `MAIN_GUILD_ID` - the guild ID that owns the source roles.
- `SUB_GUILD_IDS` - comma-separated guild IDs that receive mirrored roles.
- `ROLE_GROUPS` - JSON array mapping each main role to each sub guild role.

## Example ROLE_GROUPS

```json
[
  {
    "mainRoleId": "111111111111111111",
    "mirrors": {
      "234567890123456789": "222222222222222222",
      "345678901234567890": "333333333333333333"
    }
  },
  {
    "mainRoleId": "444444444444444444",
    "mirrors": {
      "234567890123456789": "555555555555555555",
      "345678901234567890": "666666666666666666"
    }
  }
]
```

## Notes

- Discord role IDs are unique per server, so you must map each main role to matching role IDs in each sub server.
- The bot can only manage roles lower than its highest role in each server.
