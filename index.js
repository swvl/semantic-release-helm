const verifyChart = require('./lib/verifyConditions');
const prepareChart = require('./lib/prepare');
const publishChart = require('./lib/publish');

let verified = false;
let prepared = false;
let bumpChartYamlFile = false;

async function verifyConditions(pluginConfig, context) {
    await verifyChart(pluginConfig, context);
    verified = true;
}

async function prepare(pluginConfig, context) {
    if (!verified) {
        await verifyChart(pluginConfig, context);
    }

    const preparationResult = await prepareChart(pluginConfig, context);
    prepared = true;
    bumpChartYamlFile = preparationResult.bumpChartYamlFile
}

async function publish(pluginConfig, context) {
    if (!verified) {
        await verifyChart(pluginConfig, context);
    }
    if (!prepared) {
        await prepareChart(pluginConfig, context);
    }

    if (bumpChartYamlFile) {
        await publishChart(pluginConfig, context);
    }
}

module.exports = { verifyConditions, prepare, publish };
