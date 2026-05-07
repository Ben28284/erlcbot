// ================= SESSION =================

new SlashCommandBuilder()
  .setName('session')
  .setDescription('Manage sessions')
  .addSubcommand(s =>
    s.setName('start')
      .setDescription('Start session')
      .addStringOption(o =>
        o.setName('code')
          .setDescription('Server code')
          .setRequired(true)
      )
  )
  .addSubcommand(s =>
    s.setName('end')
      .setDescription('End session')
  ),

// ================= ERLC API KEY =================

new SlashCommandBuilder()
  .setName('setapikey')
  .setDescription('Set the ERLC API key')
  .addStringOption(o =>
    o.setName('key')
      .setDescription('ERLC API Key')
      .setRequired(true)
  ),

// ================= CONFIG =================

new SlashCommandBuilder()
  .setName('configure')
  .setDescription('Configure bot settings')
  .addRoleOption(o =>
    o.setName('staffrole')
      .setDescription('Set the staff role')
  )
  .addChannelOption(o =>
    o.setName('logchannel')
      .setDescription('Set the log channel')
  ),

// ================= MODERATION =================

new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a user')
  .addUserOption(o =>
    o.setName('user')
      .setDescription('User to ban')
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName('reason')
      .setDescription('Reason')
  ),

new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a user')
  .addUserOption(o =>
    o.setName('user')
      .setDescription('User to kick')
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName('reason')
      .setDescription('Reason')
  ),

new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Timeout a user')
  .addUserOption(o =>
    o.setName('user')
      .setDescription('User to timeout')
      .setRequired(true)
  )
  .addIntegerOption(o =>
    o.setName('minutes')
      .setDescription('Minutes')
      .setRequired(true)
  ),

new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Warn a user')
  .addUserOption(o =>
    o.setName('user')
      .setDescription('User to warn')
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName('reason')
      .setDescription('Reason')
  ),

// ================= UTILITY =================

new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Delete messages')
  .addIntegerOption(o =>
    o.setName('amount')
      .setDescription('Amount')
      .setRequired(true)
  ),

new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Lock the channel'),

new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Unlock the channel'),

new SlashCommandBuilder()
  .setName('slowmode')
  .setDescription('Set slowmode')
  .addIntegerOption(o =>
    o.setName('seconds')
      .setDescription('Seconds')
      .setRequired(true)
  ),

new SlashCommandBuilder()
  .setName('say')
  .setDescription('Make bot say something')
  .addStringOption(o =>
    o.setName('message')
      .setDescription('Message')
      .setRequired(true)
  ),

// ================= TICKETS =================

new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Create a support ticket'),

new SlashCommandBuilder()
  .setName('close')
  .setDescription('Close the ticket')
