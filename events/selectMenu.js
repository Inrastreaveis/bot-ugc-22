const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const path = require("path");
const db = require("../database/database");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return;

    // Painel público: usuário escolheu o corpo
    // A partir daqui, o processo aparece somente para o cliente.
    if (interaction.customId === "cliente_corpo") {

        const corpo = interaction.values[0];

        const embed = new EmbedBuilder()
            .setTitle("📂 Categoria")
            .setDescription(
`Corpo escolhido: **${corpo}**

Agora escolha uma categoria.`
            )
            .setColor("Blue");

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`cliente_categoria_${corpo}`)
            .setPlaceholder("Escolha uma categoria")
            .addOptions(
                {
                    label: "Acessórios",
                    value: "Acessórios",
                    emoji: "💎"
                },
                {
                    label: "Roupas",
                    value: "Roupas",
                    emoji: "👕"
                }
            );

        return interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(menu)
            ],
            flags: MessageFlags.Ephemeral
        });
    }
        // Cliente escolheu a categoria
    if (
        interaction.customId.startsWith(
            "cliente_categoria_"
        )
    ) {

        const corpo = interaction.customId.replace(
            "cliente_categoria_",
            ""
        );

        const categoria = interaction.values[0];

        const tipos = db.prepare(`
            SELECT DISTINCT tipo
            FROM produtos
            WHERE categoria = ?
            AND ativo = 1
            ORDER BY tipo
        `).all(categoria);

        if (!tipos.length) {
            return interaction.update({
                content:
                    "❌ Nenhum tipo cadastrado para essa categoria.",
                embeds: [],
                components: []
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId(
                `cliente_tipo_${corpo}_${categoria}`
            )
            .setPlaceholder("Escolha um tipo")
            .addOptions(
                tipos.slice(0, 25).map(t => ({
                    label: t.tipo,
                    value: t.tipo
                }))
            );

        const embed = new EmbedBuilder()
            .setTitle("📦 Escolha o Tipo")
            .setDescription(
`Corpo: **${corpo}**
Categoria: **${categoria}**

Agora escolha o tipo.`
            )
            .setColor("Blue");

        return interaction.update({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(menu)
            ]
        });
    }
        // Cliente escolheu o tipo
    if (
        interaction.customId.startsWith(
            "cliente_tipo_"
        )
    ) {

        const dados = interaction.customId
            .replace("cliente_tipo_", "")
            .split("_");

        const corpo = dados[0];
        const categoria = dados.slice(1).join("_");
        const tipo = interaction.values[0];

        const produtos = db.prepare(`
            SELECT *
            FROM produtos
            WHERE categoria = ?
            AND tipo = ?
            AND ativo = 1
            ORDER BY nome
        `).all(categoria, tipo);

        if (!produtos.length) {
            return interaction.update({
                content:
                    "❌ Nenhum produto disponível.",
                embeds: [],
                components: []
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId(
                `cliente_produto_${corpo}_${categoria}_${tipo}`
            )
            .setPlaceholder("Escolha um produto")
            .addOptions(
                produtos.slice(0, 25).map(produto => ({
                    label: produto.nome,
                    description:
                        `R$ ${Number(produto.preco)
                            .toFixed(2)
                            .replace(".", ",")}`,
                    value: String(produto.id)
                }))
            );

        const embed = new EmbedBuilder()
            .setTitle("🛍️ Escolha o Produto")
            .setDescription(
`Corpo: **${corpo}**
Categoria: **${categoria}**
Tipo: **${tipo}**

Selecione um produto.`
            )
            .setColor("Blue");

        return interaction.update({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(menu)
            ]
        });
    }
        // Cliente escolheu o produto
    if (
        interaction.customId.startsWith(
            "cliente_produto_"
        )
    ) {

        const produtoId = interaction.values[0];

        const produto = db.prepare(`
            SELECT *
            FROM produtos
            WHERE id = ?
            AND ativo = 1
        `).get(produtoId);

        if (!produto) {
            return interaction.update({
                content: "❌ Produto não encontrado.",
                embeds: [],
                components: []
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(produto.nome)
            .setDescription(
`Categoria: **${produto.categoria}**
Tipo: **${produto.tipo}**
Preço: **R$ ${Number(produto.preco)
    .toFixed(2)
    .replace(".", ",")}**`
            )
            .setColor("Blue");

        const botoes = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `personalizar_produto_${produto.id}`
                    )
                    .setLabel("Personalizar")
                    .setEmoji("✨")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("cancelar_pedido")
                    .setLabel("Cancelar")
                    .setStyle(ButtonStyle.Danger)
            );

        if (produto.imagem) {

            const caminhoImagem = path.join(
                __dirname,
                "..",
                produto.imagem
            );

            const nomeArquivo =
                path.basename(caminhoImagem);

            embed.setImage(
                `attachment://${nomeArquivo}`
            );

            return interaction.update({
                content: "",
                embeds: [embed],
                components: [botoes],
                files: [caminhoImagem]
            });
        }

        return interaction.update({
            content: "",
            embeds: [embed],
            components: [botoes],
            attachments: []
        });
    }
        // =========================
    // MENU ADMINISTRADOR
    // =========================

    if (interaction.customId === "menu_produtos") {

        switch (interaction.values[0]) {

            case "adicionar": {

                const modal = new ModalBuilder()
                    .setCustomId("modal_adicionar_produto")
                    .setTitle("Adicionar Produto");

                const categoria = new TextInputBuilder()
                    .setCustomId("categoria")
                    .setLabel("Categoria")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const tipo = new TextInputBuilder()
                    .setCustomId("tipo")
                    .setLabel("Tipo")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const nome = new TextInputBuilder()
                    .setCustomId("nome")
                    .setLabel("Nome")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const preco = new TextInputBuilder()
                    .setCustomId("preco")
                    .setLabel("Preço")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(categoria),
                    new ActionRowBuilder().addComponents(tipo),
                    new ActionRowBuilder().addComponents(nome),
                    new ActionRowBuilder().addComponents(preco)
                );

                return interaction.showModal(modal);
            }

            case "editar": {

                const produtos = db.prepare(`
                    SELECT *
                    FROM produtos
                    ORDER BY nome
                `).all();

                if (!produtos.length) {
                    return interaction.reply({
                        content: "Nenhum produto cadastrado.",
                        ephemeral: true
                    });
                }

                const menu = new StringSelectMenuBuilder()
                    .setCustomId("editar_produto")
                    .setPlaceholder("Escolha um produto")
                    .addOptions(
                        produtos.slice(0, 25).map(p => ({
                            label: p.nome,
                            description: `${p.categoria} • R$ ${p.preco}`,
                            value: String(p.id)
                        }))
                    );

                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("✏️ Editar Produto")
                            .setDescription("Selecione um produto.")
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(menu)
                    ]
                });
            }

            default:
                return interaction.reply({
                    content: "🚧 Ainda não implementado.",
                    ephemeral: true
                });
        }
    }

    if (interaction.customId === "editar_produto") {

        const id = interaction.values[0];

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`acao_produto_${id}`)
            .setPlaceholder("Escolha uma ação")
            .addOptions(
                {
                    label: "Alterar Nome",
                    value: "nome",
                    emoji: "✏️"
                },
                {
                    label: "Alterar Preço",
                    value: "preco",
                    emoji: "💰"
                },
                {
                    label: "Trocar Imagem",
                    value: "imagem",
                    emoji: "🖼️"
                },
                {
                    label: "Alterar Categoria",
                    value: "categoria",
                    emoji: "📂"
                },
                {
                    label: "Alterar Tipo",
                    value: "tipo",
                    emoji: "📦"
                },
                {
                    label: "Ativar / Desativar",
                    value: "status",
                    emoji: "🟢"
                },
                {
                    label: "Excluir Produto",
                    value: "excluir",
                    emoji: "🗑️"
                },
                {
                    label: "Visualizar Produto",
                    value: "visualizar",
                    emoji: "👀"
                }
            );

        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle("⚙️ Gerenciar Produto")
                    .setDescription("Escolha uma ação.")
            ],
            components: [
                new ActionRowBuilder().addComponents(menu)
            ]
        });
    }

    if (interaction.customId.startsWith("acao_produto_")) {

        const id = interaction.customId.split("_")[2];
        const acao = interaction.values[0];

        if (acao === "nome") {

            const modal = new ModalBuilder()
                .setCustomId(`modal_nome_${id}`)
                .setTitle("Alterar Nome");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("nome")
                        .setLabel("Novo nome")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

        if (acao === "preco") {

            const modal = new ModalBuilder()
                .setCustomId(`modal_preco_${id}`)
                .setTitle("Alterar Preço");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("preco")
                        .setLabel("Novo preço")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }
if (acao === "imagem") {

    db.prepare(`
        INSERT OR REPLACE INTO configuracoes (
            chave,
            valor
        )
        VALUES (?, ?)
    `).run(
        `trocar_imagem_${interaction.user.id}`,
        id
    );

    return interaction.reply({
        content:
`🖼️ Agora envie a nova imagem neste canal.

Ela será vinculada ao produto ID **${id}**.`,
        flags: MessageFlags.Ephemeral
    });
}
        if (acao === "categoria") {

            const modal = new ModalBuilder()
                .setCustomId(`modal_categoria_${id}`)
                .setTitle("Alterar Categoria");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("categoria")
                        .setLabel("Nova categoria")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

        if (acao === "tipo") {

            const modal = new ModalBuilder()
                .setCustomId(`modal_tipo_${id}`)
                .setTitle("Alterar Tipo");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("tipo")
                        .setLabel("Novo tipo")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

        return interaction.reply({
            content: "🚧 Essa opção será implementada na próxima etapa.",
            ephemeral: true
        });
    }

};