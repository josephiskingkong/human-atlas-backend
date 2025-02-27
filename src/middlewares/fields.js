function requireBodyFields(requiredFields) {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => req.body[field] === undefined);
        if (missingFields.length > 0) {
            return res.status(400).json({ error: `Missing required parameters: ${missingFields.join(', ')}` });
        }
        next();
    };
}

function requireParamFields(requiredFields) {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => req.params[field] === undefined);
        if (missingFields.length > 0) {
            return res.status(400).json({ error: `Missing required parameters: ${missingFields.join(', ')}` });
        }
        next();
    };
}

module.exports = { 
    requireBodyFields,
    requireParamFields
 };