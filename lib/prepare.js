const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const utils = require('./utils');

module.exports = async (pluginConfig, context) => {
    const logger = context.logger;

    const appVersion = context.nextRelease.version;

    const chartPath = pluginConfig.chartPath;
    const filePath = path.join(chartPath, 'Chart.yaml');

    const chartYaml = await fsPromises.readFile(filePath);
    const oldChart = yaml.load(chartYaml);

    const changes = {
        version: appVersion,
        appVersion: appVersion
    };

    const newChart = yaml.dump({ ...oldChart, ...changes });
    const changesString = Object.entries(changes).map(([key, value]) => `${key}: ${value}`).join(', ') || 'no changes'

    logger.log('Modifying Chart.yaml with ' + changesString);

    await fsPromises.writeFile(filePath, newChart);

    return true
};

const shouldUpdateChartVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => file.includes(chartPath))

const shouldUpdateAppVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => !(file.includes(chartPath)))