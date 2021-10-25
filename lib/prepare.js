const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const execa = require('execa');
const utils = require('./utils');

module.exports = async (pluginConfig, context) => {
    const logger = context.logger;

    const appVersion = context.nextRelease.version;

    const lastReleaseGitTag = context.lastRelease.gitTag;
    const chartPath = pluginConfig.chartPath;
    const filePath = path.join(pluginConfig.chartPath, 'Chart.yaml');

    const chartYaml = await fsPromises.readFile(filePath);
    const oldChart = yaml.load(chartYaml);

    const version = semver.inc(oldChart.version, context.nextRelease.type);

    const modifiedFiles = await utils.gitGetModifiedFilesSince(lastReleaseGitTag, 'HEAD', logger);

    const hasChartChanges = shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger);
    const hasCodeChanges = shouldUpdateAppVersion(lastReleaseGitTag, chartPath, logger);

    const changes = {};
    if (hasChartChanges) {
        changes.version = version
    } 
    if (hasCodeChanges) {
        changes.appVersion = appVersion
    } 

    const newChart = yaml.dump({ ...oldChart, ...changes });
    const changesString = Object.entries(changes).map(([key, value]) => `${key}: ${value}`).join(', ') || 'no changes'

    logger.log('Modifying Chart.yaml with ' + changesString);

    await fsPromises.writeFile(filePath, newChart);

    return hasChartChanges
};

const shouldUpdateChartVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => file.includes(chartPath))

const shouldUpdateAppVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => !(file.includes(chartPath)))