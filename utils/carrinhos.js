const carrinhos = new Map();

function normalizarCategoria(categoria) {
    const texto = String(categoria || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    return texto.includes("acessor")
        ? "acessorios"
        : "roupas";
}

function obterCarrinho(usuarioId) {
    if (!carrinhos.has(usuarioId)) {
        carrinhos.set(usuarioId, []);
    }

    return carrinhos.get(usuarioId);
}

function adicionarProduto(usuarioId, produto) {
    const carrinho = obterCarrinho(usuarioId);

    if (carrinho.length > 0) {
        const categoriaCarrinho = normalizarCategoria(
            carrinho[0].categoria
        );

        const categoriaProduto = normalizarCategoria(
            produto.categoria
        );

        if (categoriaCarrinho !== categoriaProduto) {
            return {
                sucesso: false,
                motivo: "categoria_diferente",
                categoria: categoriaCarrinho
            };
        }
    }

    carrinho.push(produto);

    return {
        sucesso: true,
        carrinho
    };
}

function removerProduto(usuarioId, indice) {
    const carrinho = obterCarrinho(usuarioId);

    if (indice < 0 || indice >= carrinho.length) {
        return false;
    }

    carrinho.splice(indice, 1);

    if (carrinho.length === 0) {
        carrinhos.delete(usuarioId);
    }

    return true;
}

function limparCarrinho(usuarioId) {
    carrinhos.delete(usuarioId);
}

module.exports = {
    obterCarrinho,
    adicionarProduto,
    removerProduto,
    limparCarrinho,
    normalizarCategoria
};