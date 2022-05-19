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

    const valuesGkefilePath = path.join(pluginConfig.chartPath, 'values-gke.yaml');

    const chartYaml = await fsPromises.readFile(filePath);
    const oldChart = yaml.load(chartYaml);
    
    const valuesGkeYaml = await fsPromises.readFile(valuesGkefilePath);
    const oldvaluesGke = yaml.load(valuesGkeYaml);

    const version = semver.inc(oldChart.version, context.nextRelease.type);

    const modifiedFiles = await utils.gitGetModifiedFilesSince(lastReleaseGitTag, 'HEAD', logger);

    const hasChartChanges = shouldUpdateChartVersion(modifiedFiles, chartPath);
    const hasCodeChanges = shouldUpdateAppVersion(modifiedFiles, chartPath);

    const changes = {};
    const Valueschanges = {};
    if (hasChartChanges) {
        changes.version = version
    } 
    if (hasCodeChanges) {
        changes.appVersion = appVersion
        Valueschanges.image.tag = appVersion
    } 

    const newChart = yaml.dump({ ...oldChart, ...changes });
    const ValuesnewChange = yaml.dump({ ...oldvaluesGke, ...Valueschanges });
    const changesString = Object.entries(changes).map(([key, value]) => `${key}: ${value}`).join(', ') || 'no changes'

    logger.log('Modifying Chart.yaml with ' + changesString);

    await fsPromises.writeFile(filePath, newChart);
    await fsPromises.writeFile(filePath, ValuesnewChange);

    return hasChartChanges
};

const shouldUpdateChartVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => file.includes(chartPath))

const shouldUpdateAppVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => !(file.includes(chartPath)))