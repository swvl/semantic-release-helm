const verifyChart = require('./lib/verifyConditions');
const prepareChart = require('./lib/prepare');
const publishChart = require('./lib/publish');

let verified = false;
let prepared = false;
let hasChartChanges = false;

async function verifyConditions(pluginConfig, context) {
    await verifyChart(pluginConfig, context);
    verified = true;
}

async function prepare(pluginConfig, context) {
    if (!verified) {
        await verifyChart(pluginConfig, context);
    }

    hasChartChanges = await prepareChart(pluginConfig, context);
    prepared = true;
}

async function publish(pluginConfig, context) {
    if (!verified) {
        await verifyChart(pluginConfig, context);
    }

    if (!prepared) {
        await prepareChart(pluginConfig, context);
    }

    if (hasChartChanges) {
        await publishChart(pluginConfig, context);
    }
}

module.exports = { verifyConditions, prepare, publish };
