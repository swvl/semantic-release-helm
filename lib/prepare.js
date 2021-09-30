const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const execa = require('execa');
const minimatch = require('minimatch')

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

    let newChart;
    const hasChartChanges = await shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger)
        newChart = yaml.dump({ ...oldChart, appVersion, version });
        logger.log('Updating Chart.yaml with version %s and appVersion %s.', version, appVersion);

    await fsPromises.writeFile(filePath, newChart);

};

async function shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger) {
    try {
        const { stdout } = await execa('git', ['--no-pager', 'diff', `${lastReleaseGitTag}..HEAD`, '--name-only'])
        const files = stdout.split('\n')
        return files
            .filter(filePath => minimatch(filePath, "!**/*values*.yaml"))
            .some(file => file.includes(chartPath))
    } catch (error) {
        logger.error(error.shortMessage || error.message)
        return false
    }
}