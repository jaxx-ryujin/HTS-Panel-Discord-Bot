const { MessageFlags } = require('discord.js');
const { buildErrorContainer } = require('../components/error');
const logger = require('../utils/logger');

async function handleInteractionError(interaction, error) {
  logger.error(
    {
      user: interaction.user ? interaction.user.id : 'unknown',
      customId: interaction.customId || interaction.commandName,
      error: error.message,
      stack: error.stack
    },
    'Error caught while handling interaction'
  );

  const container = buildErrorContainer({
    title: 'UNE ERREUR EST SURVENUE',
    message: error.message || 'Une erreur inattendue est survenue lors de cette opération.'
  });

  const payload = {
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  };

  try {
    if (interaction.deferred) {
      await interaction.editReply(payload);
    } else if (interaction.replied) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (replyError) {
    logger.error({ error: replyError.message }, 'Failed to deliver error response to user');
  }
}

module.exports = {
  handleInteractionError
};
