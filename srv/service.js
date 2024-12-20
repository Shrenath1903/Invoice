const cds = require('@sap/cds');
const odataV2Adapter = require('@cap-js-community/odata-v2-adapter');

cds.on('bootstrap', (app) => {
    app.use(odataV2Adapter());
});

module.exports = cds.server;
