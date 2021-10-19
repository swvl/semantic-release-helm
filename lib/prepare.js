const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const execa = require('execa');

module.exports = async (pluginConfig, context) => {
    const logger = context.logger;

    let version;
    const appVersion = context.nextRelease.version;

    const lastReleaseGitTag = context.lastRelease.gitTag;
    const chartPath = pluginConfig.chartPath;
    const filePath = path.join(pluginConfig.chartPath, 'Chart.yaml');

    const chartYaml = await fsPromises.readFile(filePath);
    const oldChart = yaml.load(chartYaml);

    version = semver.inc(oldChart.version, context.nextRelease.type);

    const hasChartChanges = await shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger);
    const hasCodeChanges = await shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger);
    const bumpChartYamlFile = false;

    let newChart;
    if (hasChartChanges && !hasCodeChanges) {
        // If a change happens to the Chart Directory only, bump the chart version, Package and push to the Helm Repo.
        newChart = yaml.dump({ ...oldChart, version });
        logger.log('Updating Chart.yaml with version %s.', version);
        bumpChartYamlFile = true;
    } else if ( hasChartChanges && hasCodeChanges ){
        // If a change happens to the code files and chart files, we will bump both the appVersion and Chart Version and push to the S3.
        newChart = yaml.dump({ ...oldChart, appVersion, version });
        logger.log('Updating Chart.yaml with version %s and appVersion %s.', version, appVersion);
        bumpChartYamlFile = true;
    } 
    else {
        // If a change happens to the code files only, we will bump the appVersion Only and skip pushing to the HELM Repo.
        newChart = yaml.dump({ ...oldChart, appVersion });
        logger.log('Updating Chart.yaml with appVersion %s.', appVersion);
    }

    await fsPromises.writeFile(filePath, newChart);

    return { bumpChartYamlFile }
};

async function shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger) {
    try {
        const { stdout } = await execa('git', ['--no-pager', 'diff', `${lastReleaseGitTag}..HEAD`, '--name-only'])
        const files = stdout.split('\n')
        return files
            .some(file => file.includes(chartPath))
    } catch (error) {
        logger.error(error.shortMessage || error.message)
        return false
    }
}
async function shouldUpdateAppVersion(lastReleaseGitTag, chartPath, logger) {
    try {
        const { stdout } = await execa('git', ['--no-pager', 'diff', `${lastReleaseGitTag}..HEAD`, '--name-only'])
        const files = stdout.split('\n')
        return files
            .some(file => !(file.includes(chartPath)))
    } catch (error) {
        logger.error(error.shortMessage || error.message)
        return false
    }
}