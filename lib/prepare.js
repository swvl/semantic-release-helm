const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const utils = require('./utils');

const updateValuesGKEFile = async (chartPath, hasCodeChanges, appVersion, logger) => {
    const valuesGKEFilePath = path.join(chartPath, 'values-gke.yaml');
    try {
        await fsPromises.stat(valuesGKEFilePath)
    } catch(err) {
        logger.error('[Ignored Error] This repo doesnt have values-gke.yaml file', {err, chartPath, hasCodeChanges, appVersion})
        return
    }
    const valuesGkeYaml = await fsPromises.readFile(valuesGKEFilePath);
    const oldvaluesGke = yaml.load(valuesGkeYaml);
    const updatedValuesImage = oldvaluesGke.image || {};
    if (hasCodeChanges) {
        updatedValuesImage.tag = appVersion
    }
    const ValuesnewChange = yaml.dump({ ...oldvaluesGke, image: updatedValuesImage });
    await fsPromises.writeFile(valuesGKEFilePath, ValuesnewChange);
}

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

    const hasChartChanges = shouldUpdateChartVersion(modifiedFiles, chartPath);
    const hasCodeChanges = shouldUpdateAppVersion(modifiedFiles, chartPath);

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
    
    try {
        await updateValuesGKEFile(pluginConfig.chartPath, hasCodeChanges, appVersion, logger)
    } catch(err) {
        logger.error('[Ignored Error] Updating valuesGKE file failed with error', err)
    }
    
    return hasChartChanges
};

const shouldUpdateChartVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => file.includes(chartPath))

const shouldUpdateAppVersion = (modifiedFiles, chartPath) => modifiedFiles.some(file => !(file.includes(chartPath)))