const {
  Client, GatewayIntentBits, EmbedBuilder,
  SlashCommandBuilder, REST, Routes,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionsBitField
} = require('discord.js');

const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let activeSession = null;

// LOAD FILES
let config = fs.existsSync('./config.json') ? JSON.parse(fs.readFileSync('./config.json')) : {};
let db = fs.existsSync('./database.json') ? JSON.parse(fs.readFileSync('./database.json')) : { warnings: {} };

function saveAll() {
  fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
  fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

function isStaff(member, guildId) {
  return config[guildId]?.staffRole && member.roles.cache.has(config[guildId].staffRole);
}

// ================= COMMANDS =================
const commands = [

  // SESSION
  new SlashCommandBuilder()
    .setName('session')
    .setDescription('Manage sessions')
    .addSubcommand(s =>
      s.setName('start')
        .setDescription('Start session')
        .addStringOption(o =>
          o.setName('code').setDescription('Server code').setRequired(true)))
    .addSubcommand(s =>
      s.setName('end').setDescription('End session')),

  // CONFIG
  new SlashCommandBuilder()
    .setName('configure')
    .setDescription('Setup bot')
    .addRoleOption(o => o.setName('staffrole').setDescription('Staff role'))
    .addChannelOption(o => o.setName('logchannel').setDescription('Log channel')),

  // MODERATION
  new SlashCommandBuilder().setName('ban').setDescription('Ban user')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  new SlashCommandBuilder().setName('kick').setDescription('Kick user')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  new SlashCommandBuilder().setName('timeout').setDescription('Timeout user')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Minutes').setRequired(true)),

  new SlashCommandBuilder().setName('warn').setDescription('Warn user')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  // UTILITY
  new SlashCommandBuilder().setName('clear').setDescription('Clear messages')
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),

  new SlashCommandBuilder().setName('lock').setDescription('Lock channel'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock channel'),

  new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode')
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds').setRequired(true)),

  new SlashCommandBuilder().setName('say').setDescription('Say message')
    .addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),

  // TICKETS
  new SlashCommandBuilder().setName('ticket').setDescription('Create ticket'),
  new SlashCommandBuilder().setName('close').setDescription('Close ticket')
];

// REGISTER
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands('1497762509380255865'), { body: commands });
})();

// READY
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= AUTO MOD =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.includes('http')) {
    message.delete().catch(() => {});
    return message.channel.send('🚫 Links are not allowed.');
  }

  if (!message.member.spam) message.member.spam = 0;
  message.member.spam++;

  setTimeout(() => message.member.spam--, 5000);

  if (message.member.spam > 5) {
    message.member.timeout(60000).catch(() => {});
    message.channel.send('🚫 Stop spamming.');
  }
});

// ================= JOIN/LEAVE =================
client.on('guildMemberAdd', member => {
  const ch = config[member.guild.id]?.logChannel;
  if (!ch) return;
  member.guild.channels.cache.get(ch)?.send(`👋 Welcome ${member.user.tag}`);
});

client.on('guildMemberRemove', member => {
  const ch = config[member.guild.id]?.logChannel;
  if (!ch) return;
  member.guild.channels.cache.get(ch)?.send(`👋 ${member.user.tag} left`);
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const guildId = interaction.guild.id;
  if (!config[guildId]) config[guildId] = {};

  // BUTTONS
  if (interaction.isButton()) {
    if (!activeSession) return;

    if (interaction.customId === 'copy_code') {
      return interaction.reply({ content: `📋 Code: ${activeSession.code}`, ephemeral: true });
    }

    if (interaction.customId === 'end_session') {
      if (!isStaff(interaction.member, guildId)) return;
      activeSession = null;
      return interaction.update({ content: '🔴 Session ended', embeds: [], components: [] });
    }
  }

  // CONFIG
  if (interaction.commandName === 'configure') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'Admin only', ephemeral: true });
    }

    const role = interaction.options.getRole('staffrole');
    const channel = interaction.options.getChannel('logchannel');

    if (role) config[guildId].staffRole = role.id;
    if (channel) config[guildId].logChannel = channel.id;

    saveAll();
    return interaction.reply({ content: '✅ Config saved', ephemeral: true });
  }

  // SESSION
  if (interaction.commandName === 'session') {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      if (!isStaff(interaction.member, guildId)) return;

      const code = interaction.options.getString('code');

      activeSession = { host: interaction.user.username, code };

      const embed = new EmbedBuilder()
        .setTitle('🚨 SESSION STARTED')
        .addFields(
          { name: 'Host', value: activeSession.host, inline: true },
          { name: 'Code', value: code, inline: true }
        )
        .setImage('https://cdn.discordapp.com/attachments/1478916407474258010/1501437526655766610/file_00000000cf0871f691f5783b432912e2.webp')
        .setColor(0x00BFFF);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('copy_code').setLabel('Copy Code').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('end_session').setLabel('End Session').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content: '@everyone',
        embeds: [embed],
        components: [row],
        allowedMentions: { parse: ['everyone'] }
      });
    }

    if (sub === 'end') {
      if (!isStaff(interaction.member, guildId)) return;
      activeSession = null;
      return interaction.reply('Session ended');
    }
  }

  // STAFF CHECK
  if (!isStaff(interaction.member, guildId)) {
    return interaction.reply({ content: '❌ Not staff', ephemeral: true });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason';

    if (interaction.commandName === 'ban') {
      const m = await interaction.guild.members.fetch(user.id);
      await m.ban({ reason });
      await interaction.editReply(`Banned ${user.tag}`);
    }

    if (interaction.commandName === 'kick') {
      const m = await interaction.guild.members.fetch(user.id);
      await m.kick(reason);
      await interaction.editReply(`Kicked ${user.tag}`);
    }

    if (interaction.commandName === 'timeout') {
      const minutes = interaction.options.getInteger('minutes');
      const m = await interaction.guild.members.fetch(user.id);
      await m.timeout(minutes * 60000);
      await interaction.editReply(`Timed out ${user.tag}`);
    }

    if (interaction.commandName === 'warn') {
      if (!db.warnings[user.id]) db.warnings[user.id] = [];
      db.warnings[user.id].push(reason);
      saveAll();
      await interaction.editReply(`Warned ${user.tag}`);
    }

    if (interaction.commandName === 'clear') {
      const amount = interaction.options.getInteger('amount');
      await interaction.channel.bulkDelete(amount, true);
      await interaction.editReply(`Deleted ${amount}`);
    }

    if (interaction.commandName === 'lock') {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      await interaction.editReply('Locked');
    }

    if (interaction.commandName === 'unlock') {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
      await interaction.editReply('Unlocked');
    }

    if (interaction.commandName === 'slowmode') {
      const s = interaction.options.getInteger('seconds');
      await interaction.channel.setRateLimitPerUser(s);
      await interaction.editReply(`Slowmode ${s}s`);
    }

    if (interaction.commandName === 'say') {
      const msg = interaction.options.getString('message');
      await interaction.channel.send(msg);
      await interaction.editReply('Sent');
    }

    if (interaction.commandName === 'ticket') {
      const ch = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });

      await interaction.editReply(`Ticket created: ${ch}`);
    }

    if (interaction.commandName === 'close') {
      await interaction.channel.delete();
    }

  } catch (err) {
    console.error(err);
    if (interaction.deferred) {
      interaction.editReply('❌ Error (check permissions)');
    }
  }
});

client.login(process.env.TOKEN);
