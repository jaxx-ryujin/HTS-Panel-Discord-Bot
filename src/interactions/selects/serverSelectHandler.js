const { sessionService } = require('../../services/sessionService');
const { configLoader } = require('../../config/loader');

async function handleServerSelect(interaction) {
  const selectedServerId = interaction.values[0];
  const server = configLoader.getServerById(selectedServerId);
  if (!server) {
    throw new Error('Le serveur sélectionné n\'existe pas ou est désactivé');
  }

  sessionService.setSelectedServer(interaction.user.id, selectedServerId);

  const { dashboardService } = require('../../services/dashboardService');
  const payload = await dashboardService.buildDashboardPayload({
    serverId: selectedServerId,
    userId: interaction.user.id,
    isPublic: false
  });

  return interaction.reply(payload);
}

module.exports = {
  handleServerSelect
};
