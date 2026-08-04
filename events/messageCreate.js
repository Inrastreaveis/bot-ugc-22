const db = require("../database/database");
const uploadImagem = require("../utils/uploadImagem");

module.exports = async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.attachments.size) return;

    const canalImagensId = process.env.CANAL_IMAGENS;
    const cargoImagensId = process.env.CARGO_IMAGENS;

    if (!canalImagensId || !cargoImagensId) {
        console.error(
            "❌ Configure CANAL_IMAGENS e CARGO_IMAGENS nas variáveis do Railway."
        );
        return;
    }

    // Aceita anexos somente no canal configurado
    if (message.channel.id !== canalImagensId) return;

    // Aceita anexos somente de membros com o cargo configurado
    if (!message.member?.roles.cache.has(cargoImagensId)) {
        return message.reply(
            "❌ Você não tem o cargo permitido para cadastrar imagens."
        );
    }

    const attachment = message.attachments.first();
    if (!attachment) return;

    const tiposPermitidos = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif"
    ];

    if (!attachment.contentType || !tiposPermitidos.includes(attachment.contentType)) {
        return message.reply(
            "❌ Envie uma imagem PNG, JPG, WEBP ou GIF."
        );
    }

    const chaveTroca = `trocar_imagem_${message.author.id}`;

    const trocaPendente = db.prepare(`
        SELECT valor
        FROM configuracoes
        WHERE chave = ?
    `).get(chaveTroca);

    // Troca de imagem de um produto existente
    if (trocaPendente) {
        const produtoId = trocaPendente.valor;

        const produto = db.prepare(`
            SELECT *
            FROM produtos
            WHERE id = ?
        `).get(produtoId);

        if (!produto) {
            db.prepare(`
                DELETE FROM configuracoes
                WHERE chave = ?
            `).run(chaveTroca);

            return message.reply("❌ Produto não encontrado.");
        }

        try {
            const caminho = await uploadImagem(attachment);

            db.prepare(`
                UPDATE produtos
                SET imagem = ?
                WHERE id = ?
            `).run(caminho, produtoId);

            db.prepare(`
                DELETE FROM configuracoes
                WHERE chave = ?
            `).run(chaveTroca);

            return message.reply(
                `✅ Imagem do produto **${produto.nome}** atualizada.`
            );
        } catch (erro) {
            console.error("Erro ao trocar imagem:", erro);
            return message.reply(
                "❌ Não foi possível salvar a nova imagem."
            );
        }
    }

    // Imagem de produto recém-cadastrado
    const ultimoProduto = db.prepare(`
        SELECT *
        FROM produtos
        WHERE imagem = ''
        ORDER BY id DESC
        LIMIT 1
    `).get();

    if (!ultimoProduto) {
        return message.reply(
            "❌ Não existe nenhum produto aguardando imagem."
        );
    }

    try {
        const caminho = await uploadImagem(attachment);

        db.prepare(`
            UPDATE produtos
            SET imagem = ?
            WHERE id = ?
        `).run(caminho, ultimoProduto.id);

        return message.reply(
            `✅ Imagem salva no produto **${ultimoProduto.nome}**.`
        );
    } catch (erro) {
        console.error("Erro ao salvar imagem:", erro);
        return message.reply("❌ Não foi possível salvar a imagem.");
    }
};
