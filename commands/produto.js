const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("produto")
        .setDescription("Gerenciar produtos")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setTitle("📦 Gerenciador de Produtos")
            .setDescription("Selecione uma opção.");

        const menu = new StringSelectMenuBuilder()
            .setCustomId("menu_produtos")
            .setPlaceholder("Escolha uma opção")
            .addOptions(
                {
                    label: "Adicionar Produto",
                    value: "adicionar",
                    emoji: "➕"
                },
                {
                    label: "Editar Produto",
                    value: "editar",
                    emoji: "✏️"
                },
                {
                    label: "Excluir Produto",
                    value: "excluir",
                    emoji: "🗑️"
                },
                {
                    label: "Alterar Preço",
                    value: "preco",
                    emoji: "💰"
                },
                {
                    label: "Alterar Imagem",
                    value: "imagem",
                    emoji: "🖼️"
                },
                {
                    label: "Ativar / Desativar",
                    value: "status",
                    emoji: "✅"
                }
            );

        const row = new ActionRowBuilder().addComponents(menu);

        
        
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

    }
};