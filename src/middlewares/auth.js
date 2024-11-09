async function authRequest(req, res, next) {
    // TODO: сделать достойный мидлвейр для авторизации админ-методов
    next();
}

module.exports = authRequest;