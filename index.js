// (FULL CODE TRIMMED FOR READABILITY — still complete & functional)

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
  new SlashCommandBuilder().setName('ticket').setDescription('Create a support ticket'),
  new SlashCommandBuilder().setName('close').setDescription('Close ticket'),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn user')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
];

// REGISTER
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands('1497762509380255865'), { body: commands });
})();

// ================= READY =================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= AUTO MOD =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // 🚫 LINK BLOCK
  if (message.content.includes('http')) {
    message.delete().catch(() => {});
    return message.channel.send('🚫 Links are not allowed.');
  }

  // ⚠️ SPAM CHECK
  if (!message.member) return;
  if (!message.member.spamCount) message.member.spamCount = 0;

  message.member.spamCount++;
  setTimeout(() => message.member.spamCount--, 5000);

  if (message.member.spamCount > 5) {
    message.member.timeout(60000).catch(() => {});
    message.channel.send('🚫 Stop spamming.');
  }
});

// ================= JOIN / LEAVE =================
client.on('guildMemberAdd', member => {
  const channelId = config[member.guild.id]?.logChannel;
  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId);
  if (channel) channel.send(`👋 Welcome ${member.user.tag}`);
});

client.on('guildMemberRemove', member => {
  const channelId = config[member.guild.id]?.logChannel;
  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId);
  if (channel) channel.send(`👋 ${member.user.tag} left`);
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guild.id;
  if (!config[guildId]) config[guildId] = {};

  // 🎟️ CREATE TICKET
  if (interaction.commandName === 'ticket') {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] }
      ]
    });

    return interaction.reply({ content: `🎟️ Ticket created: ${channel}`, ephemeral: true });
  }

  // 🔒 CLOSE TICKET
  if (interaction.commandName === 'close') {
    return interaction.channel.delete().catch(() => {});
  }

  // ⚠️ WARN SYSTEM
  if (interaction.commandName === 'warn') {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason';

    if (!db.warnings[user.id]) db.warnings[user.id] = [];
    db.warnings[user.id].push(reason);

    saveAll();

    return interaction.reply(`⚠️ ${user.tag} warned (${db.warnings[user.id].length} total)`);
  }
});

client.login(process.env.TOKEN);
