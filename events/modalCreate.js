const db = require("../database/database");

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { randomUUID } = require("crypto");

const pedidosPendentes = require("../utils/pedidosPendentes");

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return;

    // Adicionar Produto
    if (interaction.customId === "modal_adicionar_produto") {

        const categoria = interaction.fields.getTextInputValue("categoria");
        const tipo = interaction.fields.getTextInputValue("tipo");
        const nome = interaction.fields.getTextInputValue("nome");

        const preco = Number(
            interaction.fields
                .getTextInputValue("preco")
                .replace(",", ".")
        );

        const info = db.prepare(`
            INSERT INTO produtos
            (
                categoria,
                tipo,
                nome,
                preco,
                imagem,
                ativo
            )
            VALUES
            (?, ?, ?, ?, '', 1)
        `).run(
            categoria,
            tipo,
            nome,
            preco
        );

        return interaction.reply({
            content:
`✅ Produto cadastrado!

🆔 ID: ${info.lastInsertRowid}

Agora envie uma imagem neste canal.`,
            ephemeral: true
        });
    }

    // Alterar Nome
    if (interaction.customId.startsWith("modal_nome_")) {

        const id = interaction.customId.split("_")[2];

        const nome = interaction.fields.getTextInputValue("nome");

        db.prepare(`
            UPDATE produtos
            SET nome = ?
            WHERE id = ?
        `).run(nome, id);

        return interaction.reply({
            content: "✅ Nome alterado.",
            ephemeral: true
        });
    }

    // Alterar Preço
    if (interaction.customId.startsWith("modal_preco_")) {

        const id = interaction.customId.split("_")[2];

        const preco = Number(
            interaction.fields
                .getTextInputValue("preco")
                .replace(",", ".")
        );

        db.prepare(`
            UPDATE produtos
            SET preco = ?
            WHERE id = ?
        `).run(preco, id);

        return interaction.reply({
            content: "✅ Preço alterado.",
            ephemeral: true
        });
    }

    // Alterar Categoria
    if (interaction.customId.startsWith("modal_categoria_")) {

        const id = interaction.customId.split("_")[2];

        const categoria =
            interaction.fields.getTextInputValue("categoria");

        db.prepare(`
            UPDATE produtos
            SET categoria = ?
            WHERE id = ?
        `).run(categoria, id);

        return interaction.reply({
            content: "✅ Categoria alterada.",
            ephemeral: true
        });
    }

    // Alterar Tipo
    if (interaction.customId.startsWith("modal_tipo_")) {

        const id = interaction.customId.split("_")[2];

        const tipo =
            interaction.fields.getTextInputValue("tipo");

        db.prepare(`
            UPDATE produtos
            SET tipo = ?
            WHERE id = ?
        `).run(tipo, id);

        return interaction.reply({
            content: "✅ Tipo alterado.",
            ephemeral: true
        });
    }

    // Personalizar Produto
    if (
        interaction.customId.startsWith(
            "modal_personalizar_"
        )
    ) {

        const produtoId = interaction.customId.replace(
            "modal_personalizar_",
            ""
        );

        const produto = db.prepare(`
            SELECT *
            FROM produtos
            WHERE id = ?
            AND ativo = 1
        `).get(produtoId);

        if (!produto) {
            return interaction.reply({
                content: "❌ Produto não encontrado.",
                ephemeral: true
            });
        }

        const nome =
            interaction.fields.getTextInputValue(
                "nome_personalizacao"
            );

        const inicial =
            interaction.fields.getTextInputValue("inicial")
            || "Não informado";

        const simbolo =
            interaction.fields.getTextInputValue("simbolo")
            || "Não informado";

        const observacoes =
            interaction.fields.getTextInputValue(
                "observacoes"
            )
            || "Nenhuma";

        const token = randomUUID()
            .replace(/-/g, "")
            .slice(0, 20);

        pedidosPendentes.set(token, {
            usuarioId: interaction.user.id,
            produtoId: produto.id,
            nome,
            inicial,
            simbolo,
            observacoes,
            criadoEm: Date.now()
        });

        const embed = new EmbedBuilder()
            .setTitle("🛍️ Resumo do Produto")
            .setDescription(
`Produto: **${produto.nome}**
Categoria: **${produto.categoria}**
Tipo: **${produto.tipo}**

Nome: **${nome}**
Inicial: **${inicial}**
Símbolo: **${simbolo}**

Observações:
${observacoes}

Valor: **R$ ${Number(produto.preco)
    .toFixed(2)
    .replace(".", ",")}**`
            )
            .setColor("Green");

        if (produto.imagem) {
            const nomeArquivo = produto.imagem
                .split(/[\\/]/)
                .pop();

            embed.setImage(
                `attachment://${nomeArquivo}`
            );
        }

        const botoes =
            new ActionRowBuilder().addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `adicionar_carrinho_${token}`
                    )
                    .setLabel("Adicionar ao carrinho")
                    .setEmoji("🛒")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId(
                        `finalizar_carrinho_${token}`
                    )
                    .setLabel("Finalizar carrinho")
                    .setEmoji("✅")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId(
                        `cancelar_pedido_${token}`
                    )
                    .setLabel("Cancelar")
                    .setEmoji("❌")
                    .setStyle(ButtonStyle.Danger)
            );

        const resposta = {
            embeds: [embed],
            components: [botoes],
            ephemeral: true
        };

        if (produto.imagem) {
            resposta.files = [produto.imagem];
        }

        return interaction.reply(resposta);
    }
};