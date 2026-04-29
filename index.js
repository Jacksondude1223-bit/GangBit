require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const MAIN_GUILD_ID = process.env.MAIN_GUILD_ID;
const SUB_GUILD_IDS = process.env.SUB_GUILD_IDS
  ? process.env.SUB_GUILD_IDS.split(',').map((id) => id.trim()).filter(Boolean)
  : [];

const ROLE_GROUPS = process.env.ROLE_GROUPS
  ? JSON.parse(process.env.ROLE_GROUPS)
  : [];

if (!BOT_TOKEN) {
  throw new Error('Missing BOT_TOKEN env variable.');
}

if (!MAIN_GUILD_ID) {
  throw new Error('Missing MAIN_GUILD_ID env variable.');
}

if (!SUB_GUILD_IDS.length) {
  throw new Error('Missing SUB_GUILD_IDS env variable. Provide comma-separated guild IDs.');
}

if (!Array.isArray(ROLE_GROUPS) || !ROLE_GROUPS.length) {
  throw new Error(
    'Missing ROLE_GROUPS env variable. Provide a JSON array of role mapping groups.'
  );
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

const roleGroups = ROLE_GROUPS.map((group) => ({
  mainRoleId: String(group.mainRoleId),
  mirrors: Object.fromEntries(
    Object.entries(group.mirrors || {}).map(([guildId, roleId]) => [String(guildId), String(roleId)])
  )
}));

async function ensureMember(guild, userId) {
  try {
    return await guild.members.fetch(userId);
  } catch {
    return null;
  }
}

async function syncMemberRoles(userId) {
  const mainGuild = await client.guilds.fetch(MAIN_GUILD_ID);
  const mainMember = await ensureMember(mainGuild, userId);

  if (!mainMember) {
    return;
  }

  for (const subGuildId of SUB_GUILD_IDS) {
    const subGuild = await client.guilds.fetch(subGuildId);
    const subMember = await ensureMember(subGuild, userId);

    if (!subMember) {
      continue;
    }

    for (const group of roleGroups) {
      const targetRoleId = group.mirrors[subGuildId];
      if (!targetRoleId) {
        continue;
      }

      const hasMainRole = mainMember.roles.cache.has(group.mainRoleId);
      const hasSubRole = subMember.roles.cache.has(targetRoleId);

      if (hasMainRole && !hasSubRole) {
        await subMember.roles.add(targetRoleId, `Global role sync from main guild ${MAIN_GUILD_ID}`);
      } else if (!hasMainRole && hasSubRole) {
        await subMember.roles.remove(targetRoleId, `Global role sync from main guild ${MAIN_GUILD_ID}`);
      }
    }
  }
}

async function fullSync() {
  const mainGuild = await client.guilds.fetch(MAIN_GUILD_ID);
  const members = await mainGuild.members.fetch();

  for (const member of members.values()) {
    await syncMemberRoles(member.id);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    await fullSync();
    console.log('Initial full sync completed.');
  } catch (error) {
    console.error('Initial full sync failed:', error);
  }

  setInterval(async () => {
    try {
      await fullSync();
      console.log('Scheduled sync completed.');
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  }, 1000 * 60 * 10);
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (newMember.guild.id !== MAIN_GUILD_ID) {
    return;
  }

  const changed = roleGroups.some((group) => {
    const hadRole = oldMember.roles.cache.has(group.mainRoleId);
    const hasRole = newMember.roles.cache.has(group.mainRoleId);
    return hadRole !== hasRole;
  });

  if (!changed) {
    return;
  }

  try {
    await syncMemberRoles(newMember.id);
  } catch (error) {
    console.error(`Failed to sync updated member ${newMember.id}:`, error);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== MAIN_GUILD_ID) {
    return;
  }

  try {
    await syncMemberRoles(member.id);
  } catch (error) {
    console.error(`Failed to sync new member ${member.id}:`, error);
  }
});

client.login(BOT_TOKEN);
